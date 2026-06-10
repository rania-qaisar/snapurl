from sqlalchemy import Column, String, Boolean, DateTime, Integer, Text, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class URL(Base):
    __tablename__ = "urls"

    id = Column(Integer, primary_key=True, index=True)
    original_url = Column(Text, nullable=False)
    short_code = Column(String(32), unique=True, nullable=False, index=True)
    custom_alias = Column(String(32), unique=True, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relations
    clicks = relationship("Click", back_populates="url", cascade="all, delete-orphan")

    # Indexes for performance
    __table_args__ = (
        Index("ix_urls_short_code_active", "short_code", "is_active"),
        Index("ix_urls_created_at", "created_at"),
    )

    @property
    def effective_code(self) -> str:
        return self.custom_alias or self.short_code

    def __repr__(self):
        return f"<URL id={self.id} code={self.effective_code}>"
