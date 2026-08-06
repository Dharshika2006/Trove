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
        import os
        if settings.openai_api_key:
            os.environ["OPENAI_API_KEY"] = settings.openai_api_key
        if settings.gemini_api_key:
            os.environ["GEMINI_API_KEY"] = settings.gemini_api_key
            
        if self.model == "local":
            from chromadb.utils import embedding_functions
            self.local_ef = embedding_functions.DefaultEmbeddingFunction()
        elif self.model == "gemini":
            from google import genai
            self.genai_client = genai.Client(api_key=settings.gemini_api_key)
    
    async def embed(self, text: str) -> list[float]:
        """Generate embedding for a single text."""
        if self.model == "local":
            return self.local_ef([text])[0]
        elif self.model == "gemini":
            result = self.genai_client.models.embed_content(
                model="text-embedding-004",
                contents=text,
                config={"task_type": "retrieval_document"}
            )
            return result.embeddings[0].values
            
        response = await litellm.aembedding(
            model=self.model,
            input=[text],
        )
        return response.data[0]["embedding"]
    
    async def embed_batch(self, texts: list[str], batch_size: int = 100) -> list[list[float]]:
        """Generate embeddings for multiple texts with batching."""
        if self.model == "local":
            # The local embedding function already handles its own optimal batching
            all_embeddings = self.local_ef(texts)
            logger.info(f"Embedded {len(texts)} texts locally")
            return all_embeddings
            
        all_embeddings = []
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            if self.model == "gemini":
                result = self.genai_client.models.embed_content(
                    model="text-embedding-004",
                    contents=batch,
                    config={"task_type": "retrieval_document"}
                )
                batch_embeddings = [emb.values for emb in result.embeddings]
            else:
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
