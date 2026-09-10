import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, Integer, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    google_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    github_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    
    # Legacy columns (kept to satisfy SQLite NOT NULL constraints until Alembic migration)
    oauth_provider: Mapped[str] = mapped_column(String(20), default="legacy")
    oauth_id: Mapped[str] = mapped_column(String(255), default="legacy")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    
    researches: Mapped[list["Research"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    documents: Mapped[list["Document"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class Research(Base):
    __tablename__ = "researches"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pending"
    )  # pending, planning, searching, retrieving, summarizing, critiquing, reporting, completed, failed
    depth: Mapped[str] = mapped_column(String(10), nullable=False, default="standard")  # quick, standard, deep
    result: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # Stores intermediate agent results
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    
    user: Mapped["User"] = relationship(back_populates="researches")
    report: Mapped["Report | None"] = relationship(back_populates="research", uselist=False, cascade="all, delete-orphan")


class Document(Base):
    __tablename__ = "documents"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_type: Mapped[str] = mapped_column(String(10), nullable=False)  # pdf, docx, txt, md
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)  # bytes
    chunk_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    
    user: Mapped["User"] = relationship(back_populates="documents")


class Report(Base):
    __tablename__ = "reports"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    research_id: Mapped[str] = mapped_column(String(36), ForeignKey("researches.id"), unique=True, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)  # Markdown report
    confidence_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    coverage_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    metadata_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # Agent execution metadata
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    
    research: Mapped["Research"] = relationship(back_populates="report")
