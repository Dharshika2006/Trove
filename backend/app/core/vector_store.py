import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional
import chromadb
from app.core.config import settings

logger = logging.getLogger(__name__)

@dataclass
class VectorSearchResult:
    """A single result from vector similarity search."""
    id: str
    content: str
    metadata: dict
    score: float  # similarity score (higher = more relevant)

class VectorStore(ABC):
    """Abstract vector store interface.
    
    Implement this to swap ChromaDB for Pinecone, Qdrant, etc.
    """
    
    @abstractmethod
    async def add_documents(
        self,
        collection: str,
        ids: list[str],
        documents: list[str],
        embeddings: list[list[float]],
        metadatas: Optional[list[dict]] = None,
    ) -> None:
        """Add documents with pre-computed embeddings."""
        ...
    
    @abstractmethod
    async def search(
        self,
        collection: str,
        query_embedding: list[float],
        top_k: int = 10,
        where: Optional[dict] = None,
    ) -> list[VectorSearchResult]:
        """Search for similar documents."""
        ...
    
    @abstractmethod
    async def delete_collection(self, collection: str) -> None:
        """Delete an entire collection."""
        ...
    
    @abstractmethod
    async def collection_exists(self, collection: str) -> bool:
        """Check if a collection exists."""
        ...


class ChromaVectorStore(VectorStore):
    """ChromaDB implementation of VectorStore."""
    
    def __init__(self, persist_directory: Optional[str] = None):
        self.client = chromadb.PersistentClient(
            path=persist_directory or settings.chroma_db_path
        )
    
    async def add_documents(
        self,
        collection: str,
        ids: list[str],
        documents: list[str],
        embeddings: list[list[float]],
        metadatas: Optional[list[dict]] = None,
    ) -> None:
        col = self.client.get_or_create_collection(name=collection, metadata={"hnsw:space": "cosine"})
        col.add(
            ids=ids,
            documents=documents,
            embeddings=embeddings,
            metadatas=metadatas,
        )
        logger.info(f"Added {len(ids)} documents to collection '{collection}'")
    
    async def search(
        self,
        collection: str,
        query_embedding: list[float],
        top_k: int = 10,
        where: Optional[dict] = None,
    ) -> list[VectorSearchResult]:
        try:
            col = self.client.get_collection(name=collection)
        except Exception:
            logger.warning(f"Collection '{collection}' not found")
            return []
        
        kwargs = {
            "query_embeddings": [query_embedding],
            "n_results": min(top_k, col.count()) if col.count() > 0 else top_k,
        }
        if where:
            kwargs["where"] = where
        
        results = col.query(**kwargs)
        
        search_results = []
        if results and results["ids"] and results["ids"][0]:
            for i, doc_id in enumerate(results["ids"][0]):
                score = 1.0 - (results["distances"][0][i] if results["distances"] else 0)
                search_results.append(VectorSearchResult(
                    id=doc_id,
                    content=results["documents"][0][i] if results["documents"] else "",
                    metadata=results["metadatas"][0][i] if results["metadatas"] else {},
                    score=score,
                ))
        
        return search_results
    
    async def delete_collection(self, collection: str) -> None:
        try:
            self.client.delete_collection(name=collection)
            logger.info(f"Deleted collection '{collection}'")
        except Exception as e:
            logger.warning(f"Failed to delete collection '{collection}': {e}")
    
    async def collection_exists(self, collection: str) -> bool:
        try:
            self.client.get_collection(name=collection)
            return True
        except Exception:
            return False


_vector_store: Optional[ChromaVectorStore] = None

def get_vector_store() -> ChromaVectorStore:
    global _vector_store
    if _vector_store is None:
        _vector_store = ChromaVectorStore()
    return _vector_store
