import logging
from typing import Optional
import litellm
from app.core.config import settings

logger = logging.getLogger(__name__)

class EmbeddingClient:
    """Embedding abstraction layer.
    
    Uses OpenAI embeddings by default. Model can be swapped via configuration.
    """
    
    def __init__(self, model: Optional[str] = None):
        self.model = model or settings.embedding_model
        # Ensure API key is set
        import os
        if settings.openai_api_key:
            os.environ["OPENAI_API_KEY"] = settings.openai_api_key
    
    async def embed(self, text: str) -> list[float]:
        """Generate embedding for a single text."""
        response = await litellm.aembedding(
            model=self.model,
            input=[text],
        )
        return response.data[0]["embedding"]
    
    async def embed_batch(self, texts: list[str], batch_size: int = 100) -> list[list[float]]:
        """Generate embeddings for multiple texts with batching."""
        all_embeddings = []
        
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            response = await litellm.aembedding(
                model=self.model,
                input=batch,
            )
            batch_embeddings = [item["embedding"] for item in response.data]
            all_embeddings.extend(batch_embeddings)
            logger.info(f"Embedded batch {i//batch_size + 1}/{(len(texts)-1)//batch_size + 1}")
        
        return all_embeddings


_embedding_client: Optional[EmbeddingClient] = None

def get_embedding_client() -> EmbeddingClient:
    global _embedding_client
    if _embedding_client is None:
        _embedding_client = EmbeddingClient()
    return _embedding_client
