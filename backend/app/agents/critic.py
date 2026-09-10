import json
import logging
from app.agents.base import BaseAgent
from app.agents.models import AgentContext, AgentResult, Critique
from app.core.llm import get_llm_client

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a Research Critic Agent - the quality assurance layer of a research system.

Your responsibilities:
1. Detect CONTRADICTIONS between sources
2. Identify UNSUPPORTED CLAIMS (claims without evidence)
3. Evaluate SOURCE QUALITY (authority, directness, independence)
4. Evaluate RESEARCH COVERAGE (how many necessary perspectives/subtopics were explored)
5. Suggest MISSING RESEARCH areas

Do NOT calculate a final confidence score. You will output raw evaluation metrics that our deterministic engine will use.

Respond with JSON exactly matching this schema:
{
    "strengths": ["Strength 1", ...],
    "weaknesses": ["Weakness 1", ...],
    "contradictions": [{"claim1": "...", "claim2": "...", "sources": ["source1", "source2"]}],
    "unsupported_claims": ["Claim without evidence", ...],
    "source_evaluations": [
        {
            "url": "https://...",
            "authority": 0.9, // 0.0 to 1.0 (1.0 = highly authoritative primary source)
            "is_primary_or_independent": true // False if it just copies another source
        }
    ],
    "contradiction_severity": 0.0, // 0.0 (no contradictions) to 1.0 (fatal core contradictions)
    "core_claims_supported_ratio": 1.0, // 0.0 to 1.0 (1.0 = all core claims have evidence)
    "perspectives_covered": 2, // Integer count of distinct subtopics/perspectives actually explored
    "total_perspectives_needed": 4, // Integer count of subtopics ideally needed to fully answer the question
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

Critically evaluate this research output. Identify contradictions, unsupported claims, and evaluate the raw quality of evidence and coverage."""
        
        response = await llm.complete_json(
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            temperature=0.2,
        )
        
        # Parse LLM response
        source_evals = response.get("source_evaluations", [])
        contradiction_severity = float(response.get("contradiction_severity", 0.0))
        claims_ratio = float(response.get("core_claims_supported_ratio", 1.0))
        perspectives_covered = int(response.get("perspectives_covered", 1))
        perspectives_needed = max(1, int(response.get("total_perspectives_needed", 3)))
        
        # Deterministic Scoring Formula
        confidence, coverage = self._calculate_scores(
            source_evals=source_evals,
            contradiction_severity=contradiction_severity,
            claims_ratio=claims_ratio,
            perspectives_covered=perspectives_covered,
            perspectives_needed=perspectives_needed,
            depth=context.depth
        )
        
        critique = Critique(
            strengths=response.get("strengths", []),
            weaknesses=response.get("weaknesses", []),
            contradictions=response.get("contradictions", []),
            unsupported_claims=response.get("unsupported_claims", []),
            
            # Raw evaluations
            source_evaluations=source_evals,
            contradiction_severity=contradiction_severity,
            core_claims_supported_ratio=claims_ratio,
            perspectives_covered=perspectives_covered,
            total_perspectives_needed=perspectives_needed,
            
            # Final Scores
            evidence_confidence=confidence,
            research_coverage=coverage,
            
            recommendations=response.get("recommendations", []),
            source_quality_assessment=response.get("source_quality_assessment", ""),
        )
        
        context.critique = critique
        return AgentResult(success=True, data=critique, tokens_used=0)

    def _calculate_scores(self, source_evals: list, contradiction_severity: float, claims_ratio: float, perspectives_covered: int, perspectives_needed: int, depth: str) -> tuple[float, float]:
        # 1. Evidence Confidence
        base_authority = 0.0
        independent_sources_count = 0
        
        for eval in source_evals:
            auth = float(eval.get("authority", 0.0))
            is_indep = eval.get("is_primary_or_independent", True)
            
            if auth > base_authority:
                base_authority = auth
                
            if is_indep and auth >= 0.5:
                independent_sources_count += 1
                
        # Base confidence starts from the absolute best source (e.g. 1 highly authoritative source = 0.9)
        confidence = base_authority
        
        # Diminishing returns multiplier for additional corroborating independent sources
        # 1 extra source = +5%, 2 extra = +8%, 3 extra = +10%
        if independent_sources_count > 1:
            corroboration_bonus = min(0.15, (independent_sources_count - 1) * 0.05)
            confidence += corroboration_bonus
            
        # Penalties
        # Unsupported claims penalty
        unsupported_penalty = (1.0 - claims_ratio) * 0.5  # If 0% supported, lose 50%
        confidence -= unsupported_penalty
        
        # Contradiction penalty
        # High severity contradiction can tank the score by 40%
        contradiction_penalty = contradiction_severity * 0.4
        confidence -= contradiction_penalty
        
        confidence = max(0.0, min(1.0, confidence))
        
        # 2. Research Coverage
        # Coverage is simply how much of the needed space we explored
        coverage = perspectives_covered / max(1, perspectives_needed)
        
        # If Quick depth, we don't naturally expect full coverage, but we still report the true coverage.
        # We cap it slightly based on depth to ensure standard/deep show the difference when needed
        if depth == "quick":
            coverage = min(0.7, coverage) # Quick can't mathematically achieve 100% comprehensive coverage
            
        coverage = max(0.0, min(1.0, coverage))
        
        return round(confidence, 2), round(coverage, 2)
