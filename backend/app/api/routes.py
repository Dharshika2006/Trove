import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, Query, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from starlette.config import Config

from app.db.session import get_db
from app.db.models import User, Research, Document, Report
from app.schemas import (
    TokenResponse, UserResponse, ResearchCreate, ResearchResponse,
    ResearchListResponse, DocumentResponse, DocumentListResponse, ReportResponse,
)
from app.api.deps import get_current_user
from app.core.security import create_access_token, oauth
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

# ==================== AUTH ====================

@router.get("/auth/google", tags=["auth"])
async def google_login(request: Request):
    """Initiate Google OAuth flow."""
    if not oauth.google:
        raise HTTPException(status_code=501, detail="Google OAuth not configured")
    redirect_uri = f"{settings.backend_url}/auth/google/callback"
    return await oauth.google.authorize_redirect(request, redirect_uri)

@router.get("/auth/google/callback", tags=["auth"])
async def google_callback(request: Request, db: AsyncSession = Depends(get_db)):
    """Handle Google OAuth callback."""
    try:
        token = await oauth.google.authorize_access_token(request)
        user_info = token.get("userinfo")
        if not user_info:
            raise HTTPException(status_code=400, detail="Failed to get user info from Google")
        
        # Find or create user
        result = await db.execute(
            select(User).where(User.oauth_provider == "google", User.oauth_id == str(user_info["sub"]))
        )
        user = result.scalar_one_or_none()
        
        if not user:
            user = User(
                email=user_info["email"],
                name=user_info.get("name", user_info["email"]),
                avatar_url=user_info.get("picture"),
                oauth_provider="google",
                oauth_id=str(user_info["sub"]),
            )
            db.add(user)
            await db.flush()
        
        access_token = create_access_token({"sub": user.id})
        return RedirectResponse(url=f"{settings.frontend_url}/auth/callback?token={access_token}")
    except Exception as e:
        logger.error(f"Google OAuth error: {e}")
        return RedirectResponse(url=f"{settings.frontend_url}/auth?error=oauth_failed")

@router.get("/auth/github", tags=["auth"])
async def github_login(request: Request):
    """Initiate GitHub OAuth flow."""
    if not oauth.github:
        raise HTTPException(status_code=501, detail="GitHub OAuth not configured")
    redirect_uri = f"{settings.backend_url}/auth/github/callback"
    return await oauth.github.authorize_redirect(request, redirect_uri)

@router.get("/auth/github/callback", tags=["auth"])
async def github_callback(request: Request, db: AsyncSession = Depends(get_db)):
    """Handle GitHub OAuth callback."""
    try:
        token = await oauth.github.authorize_access_token(request)
        resp = await oauth.github.get("user", token=token)
        user_info = resp.json()
        
        # Get email (may need separate request for GitHub)
        email = user_info.get("email")
        if not email:
            emails_resp = await oauth.github.get("user/emails", token=token)
            emails = emails_resp.json()
            primary = next((e for e in emails if e.get("primary")), emails[0] if emails else None)
            email = primary["email"] if primary else f"{user_info['id']}@github.user"
        
        result = await db.execute(
            select(User).where(User.oauth_provider == "github", User.oauth_id == str(user_info["id"]))
        )
        user = result.scalar_one_or_none()
        
        if not user:
            user = User(
                email=email,
                name=user_info.get("name") or user_info.get("login", "GitHub User"),
                avatar_url=user_info.get("avatar_url"),
                oauth_provider="github",
                oauth_id=str(user_info["id"]),
            )
            db.add(user)
            await db.flush()
        
        access_token = create_access_token({"sub": user.id})
        return RedirectResponse(url=f"{settings.frontend_url}/auth/callback?token={access_token}")
    except Exception as e:
        logger.error(f"GitHub OAuth error: {e}")
        return RedirectResponse(url=f"{settings.frontend_url}/auth?error=oauth_failed")

@router.get("/auth/me", response_model=UserResponse, tags=["auth"])
async def get_me(user: User = Depends(get_current_user)):
    """Get current authenticated user."""
    return user

# ==================== RESEARCH ====================

@router.post("/research/start", response_model=ResearchResponse, tags=["research"])
async def start_research(
    data: ResearchCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Start a new research task. Runs asynchronously in the background."""
    research = Research(
        user_id=user.id,
        question=data.question,
        depth=data.depth,
        status="pending",
    )
    db.add(research)
    await db.commit()
    await db.refresh(research)
    
    # Import here to avoid circular imports
    from app.services.orchestrator import ResearchOrchestrator
    orchestrator = ResearchOrchestrator()
    background_tasks.add_task(
        orchestrator.run_research,
        research_id=research.id,
        question=data.question,
        depth=data.depth,
        document_ids=data.document_ids,
    )
    
    return ResearchResponse(
        id=research.id,
        question=research.question,
        status=research.status,
        depth=research.depth,
        created_at=research.created_at,
    )

@router.get("/research/{research_id}", response_model=ResearchResponse, tags=["research"])
async def get_research(
    research_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get research status and details."""
    result = await db.execute(
        select(Research).where(Research.id == research_id, Research.user_id == user.id)
    )
    research = result.scalar_one_or_none()
    if not research:
        raise HTTPException(status_code=404, detail="Research not found")
    
    # Check if report exists
    report_result = await db.execute(select(Report).where(Report.research_id == research_id))
    report = report_result.scalar_one_or_none()
    
    return ResearchResponse(
        id=research.id,
        question=research.question,
        status=research.status,
        depth=research.depth,
        error_message=research.error_message,
        created_at=research.created_at,
        completed_at=research.completed_at,
        has_report=report is not None,
        confidence_score=report.confidence_score if report else None,
    )

@router.get("/research/history/list", response_model=ResearchListResponse, tags=["research"])
async def get_research_history(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get paginated research history for current user."""
    # Count total
    count_result = await db.execute(
        select(func.count(Research.id)).where(Research.user_id == user.id)
    )
    total = count_result.scalar() or 0
    
    # Fetch items
    result = await db.execute(
        select(Research)
        .where(Research.user_id == user.id)
        .order_by(desc(Research.created_at))
        .offset(skip)
        .limit(limit)
    )
    researches = result.scalars().all()
    
    items = []
    for r in researches:
        report_result = await db.execute(select(Report).where(Report.research_id == r.id))
        report = report_result.scalar_one_or_none()
        items.append(ResearchResponse(
            id=r.id,
            question=r.question,
            status=r.status,
            depth=r.depth,
            error_message=r.error_message,
            created_at=r.created_at,
            completed_at=r.completed_at,
            has_report=report is not None,
            confidence_score=report.confidence_score if report else None,
        ))
    
    return ResearchListResponse(items=items, total=total)

@router.delete("/research/{research_id}", tags=["research"])
async def delete_research(
    research_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Delete a research and its report."""
    result = await db.execute(
        select(Research).where(Research.id == research_id, Research.user_id == user.id)
    )
    research = result.scalar_one_or_none()
    if not research:
        raise HTTPException(status_code=404, detail="Research not found")
    await db.delete(research)
    return {"detail": "Research deleted"}

# ==================== DOCUMENTS ====================

@router.post("/documents/upload", response_model=DocumentResponse, tags=["documents"])
async def upload_document(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Upload and process a document."""
    # Validate file type
    allowed_types = {"pdf", "docx", "txt", "md"}
    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename else ""
    if ext not in allowed_types:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}. Allowed: {allowed_types}")
    
    # Save file
    from app.services.storage import LocalStorage
    storage = LocalStorage()
    file_content = await file.read()
    file_path = await storage.save(file_content, file.filename or "unnamed", user.id)
    
    document = Document(
        user_id=user.id,
        filename=file.filename or "unnamed",
        file_path=file_path,
        file_type=ext,
        file_size=len(file_content),
    )
    db.add(document)
    await db.flush()
    
    # Process document in background (chunking + embedding)
    # This will be called by the orchestrator when needed
    
    return document

@router.get("/documents", response_model=DocumentListResponse, tags=["documents"])
async def list_documents(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """List all documents for current user."""
    result = await db.execute(
        select(Document)
        .where(Document.user_id == user.id)
        .order_by(desc(Document.created_at))
    )
    documents = result.scalars().all()
    return DocumentListResponse(items=list(documents), total=len(documents))

@router.delete("/documents/{document_id}", tags=["documents"])
async def delete_document(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Delete a document and its vectors."""
    result = await db.execute(
        select(Document).where(Document.id == document_id, Document.user_id == user.id)
    )
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Delete file from storage
    from app.services.storage import LocalStorage
    storage = LocalStorage()
    await storage.delete(document.file_path)
    
    # Delete vectors from ChromaDB
    try:
        from app.core.vector_store import get_vector_store
        vs = get_vector_store()
        await vs.delete_collection(f"doc_{document_id}")
    except Exception as e:
        logger.warning(f"Failed to delete vectors for document {document_id}: {e}")
    
    await db.delete(document)
    return {"detail": "Document deleted"}

# ==================== REPORTS ====================

@router.get("/reports/{research_id}", response_model=ReportResponse, tags=["reports"])
async def get_report(
    research_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get the report for a research."""
    # Verify user owns this research
    research_result = await db.execute(
        select(Research).where(Research.id == research_id, Research.user_id == user.id)
    )
    if not research_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Research not found")
    
    result = await db.execute(select(Report).where(Report.research_id == research_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not yet generated")
    return report

@router.get("/health", tags=["system"])
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "trove-backend"}
