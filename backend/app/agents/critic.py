import json
import logging
from app.agents.base import BaseAgent
from app.agents.models import AgentContext, AgentResult, Critique
from app.core.llm import get_llm_client

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a Research Critic Agent — the quality assurance layer of a research system.

Your responsibilities:
1. Detect CONTRADICTIONS between sources
2. Identify UNSUPPORTED CLAIMS (claims without evidence)
3. Detect potential HALLUCINATIONS or fabricated information
4. Evaluate SOURCE QUALITY (credibility, recency, relevance)
5. Calculate a CONFIDENCE SCORE (0.0 to 1.0)
6. Suggest MISSING RESEARCH areas

Confidence Score Guidelines:
- 0.9-1.0: Multiple high-quality sources agree, well-established facts
- 0.7-0.89: Good source agreement with some minor gaps
- 0.5-0.69: Mixed sources, some contradictions, moderate evidence
- 0.3-0.49: Significant contradictions, limited evidence
- 0.0-0.29: Poor evidence, major contradictions, unreliable sources

Respond with JSON:
{
    "strengths": ["Strength 1", ...],
    "weaknesses": ["Weakness 1", ...],
    "contradictions": [{"claim1": "...", "claim2": "...", "sources": ["source1", "source2"]}],
    "unsupported_claims": ["Claim without evidence", ...],
    "confidence_score": 0.75,
    "recommendations": ["Additional research needed on...", ...],
    "source_quality_assessment": "Overall assessment of source quality..."
}"""

class CriticAgent(BaseAgent):
    """Evaluates research quality, detects contradictions, assigns confidence."""
    
    name = "critic"
    description = "Quality assurance: contradiction detection, source evaluation, confidence scoring"
    
    async def execute(self, context: AgentContext) -> AgentResult:
        if not context.summary:
            return AgentResult(success=False, error="No summary to critique")
        
        llm = get_llm_client()
        
        # Build analysis input
        summary = context.summary
        findings_text = "\n".join(f"- {f}" for f in summary.key_findings)
        facts_text = "\n".join(f"- {f['fact']} (Source: {f.get('source', 'Unknown')})" for f in summary.facts)
        stats_text = "\n".join(f"- {s['stat']} (Source: {s.get('source', 'Unknown')})" for s in summary.statistics)
        sources_text = "\n".join(
            f"- [{s.get('type', 'web')}] {s.get('title', 'Unknown')} ({s.get('url', '')})" 
            for s in summary.source_references
        )
        
        user_message = f"""Research Question: {context.question}

Key Findings:
{findings_text}

Facts:
{facts_text}

Statistics:
{stats_text}

Sources Used:
{sources_text}

Number of sources: {len(summary.source_references)}
Number of web search results: {len(context.search_results)}
Number of document chunks: {len(context.document_chunks)}

Critically evaluate this research output. Identify contradictions, unsupported claims, and calculate a confidence score."""
        
        response = await llm.complete_json(
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            temperature=0.2,
        )
        
        critique = Critique(
            strengths=response.get("strengths", []),
            weaknesses=response.get("weaknesses", []),
            contradictions=response.get("contradictions", []),
            unsupported_claims=response.get("unsupported_claims", []),
            confidence_score=max(0.0, min(1.0, response.get("confidence_score", 0.5))),
            recommendations=response.get("recommendations", []),
            source_quality_assessment=response.get("source_quality_assessment", ""),
        )
        
        context.critique = critique
        return AgentResult(success=True, data=critique, tokens_used=0)
