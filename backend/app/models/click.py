from sqlalchemy import Column, String, DateTime, Integer, ForeignKey, Text, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Click(Base):
    __tablename__ = "clicks"

    id = Column(Integer, primary_key=True, index=True)
    url_id = Column(Integer, ForeignKey("urls.id", ondelete="CASCADE"), nullable=False)
    clicked_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    referer = Column(Text, nullable=True)
    country = Column(String(2), nullable=True)
    device_type = Column(String(20), nullable=True)  # desktop, mobile, tablet
    browser = Column(String(50), nullable=True)
    os = Column(String(50), nullable=True)

    # Relations
    url = relationship("URL", back_populates="clicks")

    __table_args__ = (
        Index("ix_clicks_url_id_clicked_at", "url_id", "clicked_at"),
        Index("ix_clicks_clicked_at", "clicked_at"),
    )

    def __repr__(self):
        return f"<Click id={self.id} url_id={self.url_id}>"
