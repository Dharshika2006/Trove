import logging
from typing import Optional
from app.agents.base import BaseAgent
from app.agents.models import AgentContext, AgentResult, WebSearchResult
from app.core.config import settings

logger = logging.getLogger(__name__)

class SearchAgent(BaseAgent):
    """Searches the web for relevant information using Tavily API.
    
    This agent ONLY retrieves — it never summarizes or interprets.
    Returns raw search results with metadata.
    """
    
    name = "search"
    description = "Searches the web for relevant information on research subtasks"
    
    async def execute(self, context: AgentContext) -> AgentResult:
        if not settings.tavily_api_key:
            logger.warning("Tavily API key not configured, skipping web search")
            return AgentResult(success=True, data=[], tokens_used=0)
        
        from tavily import AsyncTavilyClient
        client = AsyncTavilyClient(api_key=settings.tavily_api_key)
        
        all_results: list[WebSearchResult] = []
        seen_urls: set[str] = set()
        
        # Determine search depth based on research depth
        search_depth = "advanced" if context.depth == "deep" else "basic"
        
        # Get subtasks from planner, or use the original question
        queries = []
        if context.research_plan and context.research_plan.subtasks:
            queries = context.research_plan.subtasks
        else:
            queries = [context.question]
        
        for query in queries:
            try:
                response = await client.search(
                    query=query,
                    search_depth=search_depth,
                    max_results=2,
                    include_raw_content=True,
                )
                
                for result in response.get("results", []):
                    url = result.get("url", "")
                    if url in seen_urls:
                        continue
                    seen_urls.add(url)
                    
                    all_results.append(WebSearchResult(
                        title=result.get("title", ""),
                        url=url,
                        snippet=result.get("content", "")[:300],
                        content=result.get("raw_content", result.get("content", ""))[:800],
                        published_date=result.get("published_date"),
                        relevance_score=result.get("score", 0.5),
                        source_type=self._classify_source(url),
                        credibility_score=self._estimate_credibility(url),
                    ))
                    
            except Exception as e:
                logger.error(f"Search failed for query '{query}': {e}")
                continue
        
        context.search_results = all_results
        logger.info(f"Search agent found {len(all_results)} unique results")
        
        return AgentResult(success=True, data=all_results, tokens_used=0)
    
    def _classify_source(self, url: str) -> str:
        """Classify source type based on URL patterns."""
        url_lower = url.lower()
        if any(d in url_lower for d in [".gov", ".gov."]):
            return "government"
        if any(d in url_lower for d in [".edu", "scholar.google", "arxiv.org", "pubmed", "doi.org", "jstor"]):
            return "academic"
        if any(d in url_lower for d in ["reuters", "apnews", "bbc", "nytimes", "washingtonpost", "theguardian"]):
            return "news"
        return "web"
    
    def _estimate_credibility(self, url: str) -> float:
        """Estimate source credibility based on domain."""
        url_lower = url.lower()
        if any(d in url_lower for d in [".gov", ".edu", "who.int", "un.org"]):
            return 0.9
        if any(d in url_lower for d in ["arxiv.org", "nature.com", "science.org", "pubmed"]):
            return 0.85
        if any(d in url_lower for d in ["reuters", "apnews", "bbc.com"]):
            return 0.8
        if any(d in url_lower for d in ["nytimes", "washingtonpost", "theguardian", "economist"]):
            return 0.75
        if any(d in url_lower for d in ["wikipedia.org"]):
            return 0.65
        return 0.5
