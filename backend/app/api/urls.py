from fastapi import APIRouter, Depends, HTTPException, Request, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.config import settings
from app.schemas.url import URLCreate, URLResponse, URLAnalytics, URLListResponse
from app.services import url_service

router = APIRouter()


def build_url_response(url_obj, short_url: str, total_clicks: int = 0) -> dict:
    return {
        "id": url_obj.id,
        "original_url": url_obj.original_url,
        "short_code": url_obj.short_code,
        "custom_alias": url_obj.custom_alias,
        "short_url": short_url,
        "is_active": url_obj.is_active,
        "expires_at": url_obj.expires_at,
        "created_at": url_obj.created_at,
        "total_clicks": total_clicks,
    }


@router.post("/shorten", response_model=URLResponse, status_code=201)
async def shorten_url(data: URLCreate, db: AsyncSession = Depends(get_db)):
    try:
        url_obj = await url_service.create_short_url(db, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    short_url = f"{settings.BASE_URL}/{url_obj.effective_code}"
    return build_url_response(url_obj, short_url)


@router.get("/urls", response_model=URLListResponse)
async def list_urls(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    result = await url_service.list_urls(db, page=page, page_size=page_size)
    urls_response = []
    for u in result["urls"]:
        short_url = f"{settings.BASE_URL}/{u.effective_code}"
        urls_response.append(
            build_url_response(u, short_url, result["click_map"].get(u.id, 0))
        )
    return {
        "urls": urls_response,
        "total": result["total"],
        "page": result["page"],
        "page_size": result["page_size"],
    }


@router.get("/urls/{code}/analytics", response_model=URLAnalytics)
async def get_analytics(code: str, db: AsyncSession = Depends(get_db)):
    data = await url_service.get_url_analytics(db, code)
    if not data:
        raise HTTPException(status_code=404, detail="URL not found")

    url_obj = data["url"]
    short_url = f"{settings.BASE_URL}/{url_obj.effective_code}"
    url_response = build_url_response(url_obj, short_url, data["total_clicks"])

    return {
        "url": url_response,
        "total_clicks": data["total_clicks"],
        "clicks_last_7_days": data["clicks_last_7_days"],
        "clicks_last_30_days": data["clicks_last_30_days"],
        "device_breakdown": data["device_breakdown"],
        "browser_breakdown": data["browser_breakdown"],
        "top_referers": data["top_referers"],
    }


@router.delete("/urls/{code}", status_code=204)
async def delete_url(code: str, db: AsyncSession = Depends(get_db)):
    deleted = await url_service.delete_url(db, code)
    if not deleted:
        raise HTTPException(status_code=404, detail="URL not found")


@router.patch("/urls/{code}/toggle", response_model=URLResponse)
async def toggle_url(code: str, db: AsyncSession = Depends(get_db)):
    url_obj = await url_service.toggle_url_status(db, code)
    if not url_obj:
        raise HTTPException(status_code=404, detail="URL not found")
    short_url = f"{settings.BASE_URL}/{url_obj.effective_code}"
    return build_url_response(url_obj, short_url)


@router.get("/{code}")
async def redirect_url(code: str, request: Request, db: AsyncSession = Depends(get_db)):
    ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    referer = request.headers.get("referer")

    original_url = await url_service.resolve_short_code(db, code, ip, user_agent, referer)
    if not original_url:
        raise HTTPException(status_code=404, detail="Short URL not found or has expired")

    return RedirectResponse(url=original_url, status_code=302)
