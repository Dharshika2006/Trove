import logging
from app.agents.base import BaseAgent
from app.agents.models import AgentContext, AgentResult, RetrievalResult
from app.core.llm import get_llm_client
from app.core.embeddings import get_embedding_client
from app.core.vector_store import get_vector_store

logger = logging.getLogger(__name__)

QUERY_REWRITE_PROMPT = """You are a search query optimizer. Given a research subtask, generate an optimized search query for vector similarity search.

Subtask: {subtask}
Original Question: {question}

Generate a concise, keyword-rich query that would match relevant document chunks. Output ONLY the query text, nothing else."""

class RetrieverAgent(BaseAgent):
    """Retrieves and merges content from vector DB and web search results."""
    
    name = "retriever"
    description = "Performs hybrid retrieval, merging and ranking results from all sources"
    
    async def execute(self, context: AgentContext) -> AgentResult:
        all_results: list[RetrievalResult] = []
        
        # 1. Retrieve from uploaded documents via vector search
        if context.document_ids:
            doc_results = await self._retrieve_from_documents(context)
            all_results.extend(doc_results)
        
        # 2. Convert web search results to retrieval results
        for sr in context.search_results:
            all_results.append(RetrievalResult(
                content=sr.content or sr.snippet,
                source_title=sr.title,
                source_url=sr.url,
                source_type=sr.source_type,
                relevance_score=sr.relevance_score,
                metadata={
                    "published_date": sr.published_date,
                    "credibility_score": sr.credibility_score,
                },
            ))
        
        # 3. Deduplicate by content similarity (simple approach: exact substring)
        all_results = self._deduplicate(all_results)
        
        # 4. Sort by relevance
        all_results.sort(key=lambda r: r.relevance_score, reverse=True)
        
        # 5. Limit results based on depth
        max_results = {"quick": 10, "standard": 20, "deep": 30}.get(context.depth, 20)
        all_results = all_results[:max_results]
        
        context.retrieved_content = all_results
        logger.info(f"Retriever merged {len(all_results)} results")
        
        return AgentResult(success=True, data=all_results, tokens_used=0)
    
    async def _retrieve_from_documents(self, context: AgentContext) -> list[RetrievalResult]:
        """Query vector DB for each subtask."""
        results = []
        embedder = get_embedding_client()
        vector_store = get_vector_store()
        
        queries = []
        if context.research_plan and context.research_plan.subtasks:
            queries = context.research_plan.subtasks[:5]  # Limit queries
        else:
            queries = [context.question]
        
        for query in queries:
            try:
                query_embedding = await embedder.embed(query)
                
                for doc_id in context.document_ids:
                    collection = f"doc_{doc_id}"
                    search_results = await vector_store.search(
                        collection=collection,
                        query_embedding=query_embedding,
                        top_k=5,
                    )
                    
                    for sr in search_results:
                        results.append(RetrievalResult(
                            content=sr.content,
                            source_title=sr.metadata.get("filename", "Uploaded Document"),
                            source_url=f"document://{doc_id}",
                            source_type="document",
                            relevance_score=sr.score,
                            metadata=sr.metadata,
                        ))
            except Exception as e:
                logger.error(f"Vector search failed for query '{query}': {e}")
        
        return results
    
    def _deduplicate(self, results: list[RetrievalResult]) -> list[RetrievalResult]:
        """Remove duplicate results based on content overlap."""
        unique = []
        seen_content: list[str] = []
        
        for result in results:
            content_preview = result.content[:200].lower().strip()
            is_duplicate = False
            
            for seen in seen_content:
                # Simple overlap check
                if content_preview in seen or seen in content_preview:
                    is_duplicate = True
                    break
            
            if not is_duplicate:
                unique.append(result)
                seen_content.append(content_preview)
        
        return unique
