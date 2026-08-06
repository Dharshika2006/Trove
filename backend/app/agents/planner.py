import json
import logging
from app.agents.base import BaseAgent
from app.agents.models import AgentContext, AgentResult, ResearchPlan
from app.core.llm import get_llm_client
from datetime import datetime

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a Research Planning Agent. Your job is to analyze a user's research question and create a detailed research plan.

Your responsibilities:
1. Understand the user's intent and the core research objective
2. Rewrite ambiguous questions into clear, researchable forms
3. Identify the research scope (what's in scope and what's not)
4. Break the question into specific, actionable research subtasks
5. Prioritize subtasks (high, medium, low)
6. Estimate what types of sources would be most valuable

Research depth levels:
- quick: 2-3 focused subtasks, surface-level research
- standard: 4-6 subtasks, balanced depth and breadth
- deep: 8-10 subtasks, thorough multi-angle research

Respond with JSON in this exact format:
{
    "goal": "Clear statement of the research goal",
    "rewritten_question": "The question rewritten for clarity and precision",
    "subtasks": ["Subtask 1", "Subtask 2", ...],
    "priorities": ["high", "medium", ...],
    "estimated_sources": ["web", "academic", "news", "government", "statistics"],
    "research_scope": "Brief description of what this research will and won't cover"
}"""

class PlannerAgent(BaseAgent):
    """Analyzes user questions and creates structured research plans."""
    
    name = "planner"
    description = "Understands research intent and decomposes questions into actionable subtasks"
    
    async def execute(self, context: AgentContext) -> AgentResult:
        llm = get_llm_client()
        
        user_message = f"""Current Date: {datetime.now().strftime('%Y-%m-%d')}
Research Question: {context.question}
Research Depth: {context.depth}

Create a research plan for this question at the specified depth level."""
        
        response = await llm.complete_json(
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            temperature=0.3,
        )
        
        plan = ResearchPlan(
            goal=response.get("goal", context.question),
            rewritten_question=response.get("rewritten_question", context.question),
            subtasks=response.get("subtasks", [context.question]),
            priorities=response.get("priorities", ["high"]),
            estimated_sources=response.get("estimated_sources", ["web"]),
            research_scope=response.get("research_scope", ""),
        )
        
        context.research_plan = plan
        
        return AgentResult(
            success=True,
            data=plan,
            tokens_used=0,  # Will be set by run() wrapper via LLM tracking
        )
