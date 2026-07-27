import logging
from app.agents.base import BaseAgent
from app.agents.models import AgentContext, AgentResult, FinalReport
from app.core.llm import get_llm_client

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a Research Report Generator. Create a comprehensive, visually appealing research report.

Report Structure (use strict markdown formatting, including `##` for all section headers):

## 1. Executive Summary
(2-3 paragraph overview of findings)

## 2. Research Question
(The original and refined research question)

## 3. Methodology
(How the research was conducted - agents used, sources searched, documents analyzed)

## 4. Evidence & Analysis
(Detailed analysis of the evidence found)

## 5. Arguments For
(Arguments supporting one perspective)

## 6. Arguments Against
(Arguments against or alternative perspectives)

## 7. Key Statistics
(Important numbers and data points)

## 8. Source Comparison
(How different sources compare on this topic)

## 9. Limitations
(Gaps in the research, potential biases)

## 10. Confidence Assessment
(Overall confidence in the findings)

## 11. References
(Numbered list of all sources)

CRITICAL RULES:
- Every claim MUST have an inline citation like [1], [2], etc.
- Citations reference the numbered sources in the References section
- Be balanced — present multiple perspectives
- Distinguish facts from opinions
- Acknowledge limitations and gaps
- Use clear, professional language
- Format using proper Markdown"""

class ReportAgent(BaseAgent):
    """Generates the final structured research report with citations."""
    
    name = "report"
    description = "Creates comprehensive research reports with citations and analysis"
    
    async def execute(self, context: AgentContext) -> AgentResult:
        llm = get_llm_client()
        
        # Build comprehensive input from all prior agents
        input_text = self._build_report_input(context)
        
        response = await llm.complete(
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": input_text},
            ],
            temperature=0.3,
            max_tokens=8192,
        )
        
        # Build references list
        references = []
        if context.summary and context.summary.source_references:
            for i, ref in enumerate(context.summary.source_references, 1):
                references.append({
                    "index": i,
                    "title": ref.get("title", "Unknown"),
                    "url": ref.get("url", ""),
                    "type": ref.get("type", "web"),
                })
        
        confidence = context.critique.confidence_score if context.critique else 0.5
        
        report = FinalReport(
            title=f"Research Report: {context.question}",
            full_markdown=response.content,
            confidence_score=confidence,
            references=references,
            research_question=context.question,
            methodology=f"Multi-agent research system using {len(context.search_results)} web sources and {len(context.document_chunks)} document chunks",
        )
        
        context.final_report = report
        return AgentResult(success=True, data=report, tokens_used=0)
    
    def _build_report_input(self, context: AgentContext) -> str:
        """Compile all agent outputs into a comprehensive input for report generation."""
        parts = [f"Research Question: {context.question}\n"]
        
        # Research Plan
        if context.research_plan:
            parts.append(f"Research Goal: {context.research_plan.goal}")
            parts.append(f"Research Scope: {context.research_plan.research_scope}")
            parts.append(f"Subtasks investigated: {', '.join(context.research_plan.subtasks)}\n")
        
        # Summary
        if context.summary:
            s = context.summary
            parts.append("=== KEY FINDINGS ===")
            for f in s.key_findings:
                parts.append(f"- {f}")
            parts.append("\n=== FACTS ===")
            for f in s.facts:
                parts.append(f"- {f['fact']} (Source: {f.get('source', '')})")
            parts.append("\n=== STATISTICS ===")
            for stat in s.statistics:
                parts.append(f"- {stat['stat']} (Source: {stat.get('source', '')})")
            parts.append("\n=== QUOTES ===")
            for q in s.quotes:
                parts.append(f"- \"{q['quote']}\" - {q.get('author', '')} (Source: {q.get('source', '')})")
            parts.append("\n=== REFERENCES ===")
            for i, ref in enumerate(s.source_references, 1):
                parts.append(f"[{i}] {ref.get('title', '')} ({ref.get('url', '')})")
                
        # Critique
        if context.critique:
            c = context.critique
            parts.append("\n=== CRITIQUE & LIMITATIONS ===")
            parts.append(f"Confidence Score: {c.confidence_score}")
            parts.append("Strengths:")
            for s in c.strengths:
                parts.append(f"- {s}")
            parts.append("Weaknesses/Limitations:")
            for w in c.weaknesses:
                parts.append(f"- {w}")
            parts.append("Contradictions:")
            for contradiction in c.contradictions:
                parts.append(f"- Claim 1: {contradiction.get('claim1', '')}")
                parts.append(f"  Claim 2: {contradiction.get('claim2', '')}")
                parts.append(f"  Sources: {', '.join(contradiction.get('sources', []))}")
                
        return "\n".join(parts)
