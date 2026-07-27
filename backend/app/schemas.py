from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

# ---- Auth ----

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    avatar_url: Optional[str] = None
    oauth_provider: str
    created_at: datetime
    
    class Config:
        from_attributes = True

# ---- Research ----

class ResearchCreate(BaseModel):
    question: str = Field(..., min_length=10, max_length=2000, description="The research question")
    depth: str = Field(default="standard", pattern="^(quick|standard|deep)$")
    document_ids: list[str] = Field(default_factory=list, description="IDs of uploaded documents to include")

class ResearchResponse(BaseModel):
    id: str
    question: str
    status: str
    depth: str
    error_message: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    has_report: bool = False
    confidence_score: Optional[float] = None
    
    class Config:
        from_attributes = True

class ResearchListResponse(BaseModel):
    items: list[ResearchResponse]
    total: int

# ---- Documents ----

class DocumentResponse(BaseModel):
    id: str
    filename: str
    file_type: str
    file_size: int
    chunk_count: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class DocumentListResponse(BaseModel):
    items: list[DocumentResponse]
    total: int

# ---- Reports ----

class ReportResponse(BaseModel):
    id: str
    research_id: str
    content: str
    confidence_score: float
    metadata_json: Optional[dict] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

# ---- WebSocket Messages ----

class AgentProgressMessage(BaseModel):
    type: str  # agent_started, agent_progress, agent_completed, agent_error, research_complete
    agent_name: str
    status: str  # waiting, running, completed, error
    elapsed_time: Optional[float] = None
    preview_data: Optional[dict] = None
    error: Optional[str] = None
