from pydantic import BaseModel, HttpUrl, field_validator, model_validator
from datetime import datetime
from typing import Optional
import re


class URLCreate(BaseModel):
    original_url: str
    custom_alias: Optional[str] = None
    expires_in_days: Optional[int] = None

    @field_validator("original_url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        v = v.strip()
        if not v.startswith(("http://", "https://")):
            v = "https://" + v
        url_regex = re.compile(
            r"^https?://"
            r"(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|"
            r"localhost|"
            r"\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})"
            r"(?::\d+)?"
            r"(?:/?|[/?]\S+)$",
            re.IGNORECASE,
        )
        if not url_regex.match(v):
            raise ValueError("Invalid URL format")
        return v

    @field_validator("custom_alias")
    @classmethod
    def validate_alias(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip().lower()
        if not re.match(r"^[a-z0-9_-]+$", v):
            raise ValueError("Alias can only contain letters, numbers, hyphens, and underscores")
        return v

    @field_validator("expires_in_days")
    @classmethod
    def validate_expiry(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v < 1:
            raise ValueError("Expiry must be at least 1 day")
        return v


class URLResponse(BaseModel):
    id: int
    original_url: str
    short_code: str
    custom_alias: Optional[str]
    short_url: str
    is_active: bool
    expires_at: Optional[datetime]
    created_at: datetime
    total_clicks: int = 0

    model_config = {"from_attributes": True}


class ClickStats(BaseModel):
    date: str
    clicks: int


class DeviceStats(BaseModel):
    device_type: str
    count: int


class BrowserStats(BaseModel):
    browser: str
    count: int


class URLAnalytics(BaseModel):
    url: URLResponse
    total_clicks: int
    clicks_last_7_days: list[ClickStats]
    clicks_last_30_days: list[ClickStats]
    device_breakdown: list[DeviceStats]
    browser_breakdown: list[BrowserStats]
    top_referers: list[dict]


class URLListResponse(BaseModel):
    urls: list[URLResponse]
    total: int
    page: int
    page_size: int
