import os
import uuid
import logging
from typing import Optional
from app.agents.base import BaseAgent
from app.agents.models import AgentContext, AgentResult, DocumentChunk
from app.core.embeddings import get_embedding_client
from app.core.vector_store import get_vector_store

logger = logging.getLogger(__name__)

class DocumentAgent(BaseAgent):
    """Processes uploaded documents: parse, chunk, embed, and store vectors."""
    
    name = "document"
    description = "Extracts, chunks, and indexes uploaded documents for retrieval"
    
    CHUNK_SIZE = 1000
    CHUNK_OVERLAP = 200
    
    async def execute(self, context: AgentContext) -> AgentResult:
        if not context.document_ids:
            logger.info("No documents to process")
            return AgentResult(success=True, data=[], tokens_used=0)
        
        all_chunks: list[DocumentChunk] = []
        
        # Get document paths from database
        from app.db.session import AsyncSessionLocal
        from app.db.models import Document
        from sqlalchemy import select
        
        async with AsyncSessionLocal() as db:
            for doc_id in context.document_ids:
                result = await db.execute(select(Document).where(Document.id == doc_id))
                doc = result.scalar_one_or_none()
                if not doc:
                    logger.warning(f"Document {doc_id} not found")
                    continue
                
                # Parse document
                text = await self._parse_file(doc.file_path, doc.file_type)
                if not text:
                    logger.warning(f"Failed to extract text from {doc.filename}")
                    continue
                
                # Chunk text
                chunks = self._chunk_text(text, doc_id, doc.filename)
                all_chunks.extend(chunks)
                
                # Generate embeddings and store in vector DB
                if chunks:
                    await self._store_chunks(doc_id, chunks)
                    
                    # Update chunk count in database
                    doc.chunk_count = len(chunks)
                    await db.commit()
        
        context.document_chunks = all_chunks
        logger.info(f"Processed {len(all_chunks)} chunks from {len(context.document_ids)} documents")
        
        return AgentResult(success=True, data=all_chunks, tokens_used=0)
    
    async def _parse_file(self, file_path: str, file_type: str) -> Optional[str]:
        """Parse document and extract text."""
        try:
            if file_type == "pdf":
                return self._parse_pdf(file_path)
            elif file_type == "docx":
                return self._parse_docx(file_path)
            elif file_type in ("txt", "md"):
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    return f.read()
            else:
                logger.warning(f"Unsupported file type: {file_type}")
                return None
        except Exception as e:
            logger.error(f"Failed to parse {file_path}: {e}")
            return None
    
    def _parse_pdf(self, file_path: str) -> str:
        """Extract text from PDF using PyMuPDF."""
        import fitz  # PyMuPDF
        text_parts = []
        with fitz.open(file_path) as pdf:
            for page_num, page in enumerate(pdf):
                page_text = page.get_text()
                if page_text.strip():
                    text_parts.append(f"[Page {page_num + 1}]\n{page_text}")
        return "\n\n".join(text_parts)
    
    def _parse_docx(self, file_path: str) -> str:
        """Extract text from DOCX."""
        from docx import Document as DocxDocument
        doc = DocxDocument(file_path)
        return "\n\n".join(para.text for para in doc.paragraphs if para.text.strip())
    
    def _chunk_text(self, text: str, doc_id: str, filename: str) -> list[DocumentChunk]:
        """Split text into overlapping chunks."""
        chunks = []
        start = 0
        chunk_index = 0
        
        while start < len(text):
            end = start + self.CHUNK_SIZE
            
            # Try to break at a sentence boundary
            if end < len(text):
                for sep in ["\n\n", ". ", "\n", " "]:
                    last_sep = text[start:end].rfind(sep)
                    if last_sep > self.CHUNK_SIZE // 2:
                        end = start + last_sep + len(sep)
                        break
            
            chunk_text = text[start:end].strip()
            if chunk_text:
                # Detect page number if present
                page = None
                if "[Page " in chunk_text:
                    try:
                        page_str = chunk_text.split("[Page ")[1].split("]")[0]
                        page = int(page_str)
                    except (IndexError, ValueError):
                        pass
                
                chunks.append(DocumentChunk(
                    content=chunk_text,
                    document_id=doc_id,
                    filename=filename,
                    page=page,
                    chunk_index=chunk_index,
                ))
                chunk_index += 1
            
            start = end - self.CHUNK_OVERLAP
            if start >= len(text):
                break
        
        # Set total_chunks for all
        for chunk in chunks:
            chunk.total_chunks = len(chunks)
        
        return chunks
    
    async def _store_chunks(self, doc_id: str, chunks: list[DocumentChunk]) -> None:
        """Generate embeddings and store chunks in vector DB."""
        embedder = get_embedding_client()
        vector_store = get_vector_store()
        
        texts = [chunk.content for chunk in chunks]
        embeddings = await embedder.embed_batch(texts)
        
        ids = [f"{doc_id}_chunk_{i}" for i in range(len(chunks))]
        metadatas = [
            {
                "document_id": chunk.document_id,
                "filename": chunk.filename,
                "page": chunk.page or 0,
                "chunk_index": chunk.chunk_index,
            }
            for chunk in chunks
        ]
        
        await vector_store.add_documents(
            collection=f"doc_{doc_id}",
            ids=ids,
            documents=texts,
            embeddings=embeddings,
            metadatas=metadatas,
        )
