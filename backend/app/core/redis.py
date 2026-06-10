import redis.asyncio as aioredis
from app.core.config import settings

redis_client: aioredis.Redis = None


async def get_redis() -> aioredis.Redis:
    return redis_client


async def init_redis():
    global redis_client
    redis_client = aioredis.from_url(
        settings.REDIS_URL,
        encoding="utf-8",
        decode_responses=True,
    )


async def close_redis():
    global redis_client
    if redis_client:
        await redis_client.aclose()


async def cache_set(key: str, value: str, ttl: int = 3600):
    await redis_client.setex(key, ttl, value)


async def cache_get(key: str) -> str | None:
    return await redis_client.get(key)


async def cache_delete(key: str):
    await redis_client.delete(key)
