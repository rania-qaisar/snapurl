from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc, text
from sqlalchemy.orm import selectinload
from datetime import datetime, timedelta, timezone
from typing import Optional
from nanoid import generate
from user_agents import parse as parse_ua

from app.models.url import URL
from app.models.click import Click
from app.schemas.url import URLCreate
from app.core.config import settings
from app.core.redis import cache_get, cache_set, cache_delete


ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"


async def generate_unique_code(db: AsyncSession) -> str:
    for _ in range(10):
        code = generate(ALPHABET, settings.SHORT_CODE_LENGTH)
        existing = await db.execute(select(URL).where(URL.short_code == code))
        if not existing.scalar_one_or_none():
            return code
    raise RuntimeError("Could not generate unique short code after 10 attempts")


async def create_short_url(db: AsyncSession, data: URLCreate) -> URL:
    # Check custom alias availability
    if data.custom_alias:
        existing = await db.execute(
            select(URL).where(URL.custom_alias == data.custom_alias)
        )
        if existing.scalar_one_or_none():
            raise ValueError(f"Alias '{data.custom_alias}' is already taken")

        alias_len = len(data.custom_alias)
        if alias_len < settings.MIN_CUSTOM_ALIAS_LENGTH:
            raise ValueError(f"Alias must be at least {settings.MIN_CUSTOM_ALIAS_LENGTH} characters")
        if alias_len > settings.MAX_CUSTOM_ALIAS_LENGTH:
            raise ValueError(f"Alias must be at most {settings.MAX_CUSTOM_ALIAS_LENGTH} characters")

    short_code = await generate_unique_code(db)
    expires_at = None
    if data.expires_in_days:
        expires_at = datetime.now(timezone.utc) + timedelta(days=data.expires_in_days)

    url = URL(
        original_url=data.original_url,
        short_code=short_code,
        custom_alias=data.custom_alias,
        expires_at=expires_at,
    )
    db.add(url)
    await db.flush()
    await db.refresh(url)

    # Cache the mapping
    await cache_set(f"url:{url.effective_code}", url.original_url, ttl=86400)

    return url


async def resolve_short_code(
    db: AsyncSession,
    code: str,
    ip: Optional[str],
    user_agent_str: Optional[str],
    referer: Optional[str],
) -> Optional[str]:
    # Try cache first
    cached = await cache_get(f"url:{code}")

    if cached:
        # Still record click async — fetch url_id from DB
        url = await db.execute(
            select(URL).where(
                and_(
                    (URL.short_code == code) | (URL.custom_alias == code),
                    URL.is_active == True,
                )
            )
        )
        url_obj = url.scalar_one_or_none()
        if url_obj:
            await _record_click(db, url_obj.id, ip, user_agent_str, referer)
        return cached

    # DB lookup
    result = await db.execute(
        select(URL).where(
            and_(
                (URL.short_code == code) | (URL.custom_alias == code),
                URL.is_active == True,
            )
        )
    )
    url_obj = result.scalar_one_or_none()

    if not url_obj:
        return None

    # Check expiry
    if url_obj.expires_at and url_obj.expires_at < datetime.now(timezone.utc):
        return None

    # Cache it
    await cache_set(f"url:{code}", url_obj.original_url, ttl=86400)

    # Record click
    await _record_click(db, url_obj.id, ip, user_agent_str, referer)

    return url_obj.original_url


async def _record_click(
    db: AsyncSession,
    url_id: int,
    ip: Optional[str],
    user_agent_str: Optional[str],
    referer: Optional[str],
):
    device_type = browser = os_name = None

    if user_agent_str:
        try:
            ua = parse_ua(user_agent_str)
            browser = ua.browser.family
            os_name = ua.os.family
            if ua.is_mobile:
                device_type = "mobile"
            elif ua.is_tablet:
                device_type = "tablet"
            else:
                device_type = "desktop"
        except Exception:
            pass

    click = Click(
        url_id=url_id,
        ip_address=ip,
        user_agent=user_agent_str,
        referer=referer,
        device_type=device_type,
        browser=browser,
        os=os_name,
    )
    db.add(click)


async def get_url_by_code(db: AsyncSession, code: str) -> Optional[URL]:
    result = await db.execute(
        select(URL).where(
            (URL.short_code == code) | (URL.custom_alias == code)
        )
    )
    return result.scalar_one_or_none()


async def get_url_analytics(db: AsyncSession, code: str) -> Optional[dict]:
    url_obj = await get_url_by_code(db, code)
    if not url_obj:
        return None

    total_clicks_result = await db.execute(
        select(func.count(Click.id)).where(Click.url_id == url_obj.id)
    )
    total_clicks = total_clicks_result.scalar() or 0

    # Clicks per day — last 7 days
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    clicks_7d = await db.execute(
        select(
            func.date(Click.clicked_at).label("date"),
            func.count(Click.id).label("clicks"),
        )
        .where(and_(Click.url_id == url_obj.id, Click.clicked_at >= seven_days_ago))
        .group_by(func.date(Click.clicked_at))
        .order_by(func.date(Click.clicked_at))
    )
    clicks_7d_rows = [{"date": str(r.date), "clicks": r.clicks} for r in clicks_7d]

    # Clicks per day — last 30 days
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    clicks_30d = await db.execute(
        select(
            func.date(Click.clicked_at).label("date"),
            func.count(Click.id).label("clicks"),
        )
        .where(and_(Click.url_id == url_obj.id, Click.clicked_at >= thirty_days_ago))
        .group_by(func.date(Click.clicked_at))
        .order_by(func.date(Click.clicked_at))
    )
    clicks_30d_rows = [{"date": str(r.date), "clicks": r.clicks} for r in clicks_30d]

    # Device breakdown
    device_result = await db.execute(
        select(Click.device_type, func.count(Click.id).label("count"))
        .where(and_(Click.url_id == url_obj.id, Click.device_type.isnot(None)))
        .group_by(Click.device_type)
        .order_by(desc("count"))
    )
    device_rows = [{"device_type": r.device_type, "count": r.count} for r in device_result]

    # Browser breakdown
    browser_result = await db.execute(
        select(Click.browser, func.count(Click.id).label("count"))
        .where(and_(Click.url_id == url_obj.id, Click.browser.isnot(None)))
        .group_by(Click.browser)
        .order_by(desc("count"))
        .limit(5)
    )
    browser_rows = [{"browser": r.browser, "count": r.count} for r in browser_result]

    # Top referers
    referer_result = await db.execute(
        select(Click.referer, func.count(Click.id).label("count"))
        .where(and_(Click.url_id == url_obj.id, Click.referer.isnot(None)))
        .group_by(Click.referer)
        .order_by(desc("count"))
        .limit(5)
    )
    referer_rows = [{"referer": r.referer, "count": r.count} for r in referer_result]

    return {
        "url": url_obj,
        "total_clicks": total_clicks,
        "clicks_last_7_days": clicks_7d_rows,
        "clicks_last_30_days": clicks_30d_rows,
        "device_breakdown": device_rows,
        "browser_breakdown": browser_rows,
        "top_referers": referer_rows,
    }


async def list_urls(db: AsyncSession, page: int = 1, page_size: int = 20) -> dict:
    offset = (page - 1) * page_size
    total_result = await db.execute(select(func.count(URL.id)))
    total = total_result.scalar() or 0

    urls_result = await db.execute(
        select(URL)
        .order_by(desc(URL.created_at))
        .offset(offset)
        .limit(page_size)
    )
    urls = urls_result.scalars().all()

    # Attach click counts
    url_ids = [u.id for u in urls]
    if url_ids:
        click_counts = await db.execute(
            select(Click.url_id, func.count(Click.id).label("count"))
            .where(Click.url_id.in_(url_ids))
            .group_by(Click.url_id)
        )
        click_map = {r.url_id: r.count for r in click_counts}
    else:
        click_map = {}

    return {
        "urls": urls,
        "click_map": click_map,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


async def delete_url(db: AsyncSession, code: str) -> bool:
    url_obj = await get_url_by_code(db, code)
    if not url_obj:
        return False
    await cache_delete(f"url:{code}")
    await db.delete(url_obj)
    return True


async def toggle_url_status(db: AsyncSession, code: str) -> Optional[URL]:
    url_obj = await get_url_by_code(db, code)
    if not url_obj:
        return None
    url_obj.is_active = not url_obj.is_active
    if not url_obj.is_active:
        await cache_delete(f"url:{url_obj.effective_code}")
    else:
        await cache_set(f"url:{url_obj.effective_code}", url_obj.original_url, ttl=86400)
    await db.flush()
    await db.refresh(url_obj)
    return url_obj
