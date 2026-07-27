import json
import logging
from app.agents.base import BaseAgent
from app.agents.models import AgentContext, AgentResult, Summary
from app.core.llm import get_llm_client

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a Research Summarizer Agent. Your job is to analyze retrieved content and extract:

1. Key Findings - The most important discoveries or conclusions
2. Facts - Verified factual statements with their sources
3. Statistics - Numerical data and statistics with sources  
4. Direct Quotes - Notable quotes from experts or officials
5. Source References - Complete list of sources used

CRITICAL RULES:
- NEVER invent or fabricate information
- EVERY fact must reference its source
- EVERY statistic must include the source
- If information is uncertain, note it explicitly
- Distinguish between facts, opinions, and claims

Respond with JSON:
{
    "key_findings": ["Finding 1", "Finding 2", ...],
    "facts": [{"fact": "...", "source": "Source Name", "source_url": "..."}],
    "statistics": [{"stat": "...", "source": "..."}],
    "quotes": [{"quote": "...", "author": "...", "source": "..."}],
    "source_references": [{"title": "...", "url": "...", "type": "web|academic|news|government|document"}]
}"""

class SummarizerAgent(BaseAgent):
    """Extracts structured information from retrieved content."""
    
    name = "summarizer"
    description = "Extracts key findings, facts, statistics, and quotes from research content"
    
    async def execute(self, context: AgentContext) -> AgentResult:
        if not context.retrieved_content:
            return AgentResult(
                success=False,
                error="No retrieved content to summarize",
            )
        
        llm = get_llm_client()
        
        # Build content block from retrieved results
        content_block = self._build_content_block(context)
        
        user_message = f"""Research Question: {context.question}

Retrieved Content:
{content_block}

Analyze this content and extract structured information. Cite every fact."""
        
        response = await llm.complete_json(
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            temperature=0.2,
            max_tokens=4096,
        )
        
        summary = Summary(
            key_findings=response.get("key_findings", []),
            facts=response.get("facts", []),
            statistics=response.get("statistics", []),
            quotes=response.get("quotes", []),
            source_references=response.get("source_references", []),
        )
        
        context.summary = summary
        return AgentResult(success=True, data=summary, tokens_used=0)
    
    def _build_content_block(self, context: AgentContext) -> str:
        """Format retrieved content into a structured text block for the LLM."""
        blocks = []
        for i, result in enumerate(context.retrieved_content, 1):
            block = f"""--- Source {i}: {result.source_title} ---
URL: {result.source_url}
Type: {result.source_type}
Relevance: {result.relevance_score:.2f}

{result.content[:2000]}
"""
            blocks.append(block)
        return "\n".join(blocks)
