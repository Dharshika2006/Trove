import logging
import time
from datetime import datetime, timezone
from typing import Optional, Any, Dict
from sqlalchemy import select

from app.agents.models import AgentContext, FinalReport
from app.agents.planner import PlannerAgent
from app.agents.search import SearchAgent
from app.agents.document import DocumentAgent
from app.agents.retriever import RetrieverAgent
from app.agents.summarizer import SummarizerAgent
from app.agents.critic import CriticAgent
from app.agents.report import ReportAgent
from app.db.session import AsyncSessionLocal
from app.db.models import Research, Report

logger = logging.getLogger(__name__)

class ResearchOrchestrator:
    """Coordinates the multi-agent research pipeline.
    
    All agent communication flows through this orchestrator.
    Agents never call each other directly, ensuring a controlled state machine execution.
    """
    
    def __init__(self) -> None:
        """Initialize the orchestrator with all necessary agents."""
        self.planner = PlannerAgent()
        self.search = SearchAgent()
        self.document = DocumentAgent()
        self.retriever = RetrieverAgent()
        self.summarizer = SummarizerAgent()
        self.critic = CriticAgent()
        self.report_gen = ReportAgent()
    
    async def _run_agent(self, research_id: str, status_name: str, agent_name: str, agent: Any, context: AgentContext) -> bool:
        logger.info(f"Research {research_id}: Starting step '{agent_name}' ({status_name})")
        
        # Don't overwrite higher-level parallel status if not necessary, but broadcast is fine
        if status_name not in ("searching", "processing_documents"):
            await self._update_status(research_id, status_name)
            
        await self._broadcast_progress(research_id, agent_name, "running")
        
        result = await agent.run(context)
        
        if result.success:
            await self._broadcast_progress(
                research_id, agent_name, "completed",
                elapsed_time=result.execution_time,
                preview_data=self._get_preview(agent_name, result.data),
            )
            return True
        else:
            logger.error(f"Agent '{agent_name}' failed for research {research_id}: {result.error}")
            await self._broadcast_progress(
                research_id, agent_name, "error",
                error=result.error,
            )
            
            if agent_name in ("search", "document", "critic"):
                logger.warning(f"Non-critical agent '{agent_name}' failed, continuing pipeline...")
                return True
            else:
                raise RuntimeError(f"Critical agent '{agent_name}' failed: {result.error}")

    async def run_research(
        self,
        research_id: str,
        question: str,
        depth: str = "standard",
        document_ids: Optional[list[str]] = None,
    ) -> Optional[FinalReport]:
        """Execute the multi-agent research pipeline."""
        start_time = time.time()
        document_ids = document_ids or []
        import asyncio
        
        context = AgentContext(
            question=question,
            depth=depth,
            research_id=research_id,
            document_ids=document_ids,
        )
        
        try:
            # 1. Planning
            await self._run_agent(research_id, "planning", "planner", self.planner, context)
            
            # 2. Parallel Search and Document Processing
            await self._update_status(research_id, "gathering_context")
            await asyncio.gather(
                self._run_agent(research_id, "searching", "search", self.search, context),
                self._run_agent(research_id, "processing_documents", "document", self.document, context)
            )
            
            # 3. Sequential processing
            await self._run_agent(research_id, "retrieving", "retriever", self.retriever, context)
            await self._run_agent(research_id, "summarizing", "summarizer", self.summarizer, context)
            await self._run_agent(research_id, "critiquing", "critic", self.critic, context)
            await self._run_agent(research_id, "reporting", "report", self.report_gen, context)
            
            # Finalize pipeline execution
            if context.final_report:
                await self._save_report(research_id, context)
                await self._update_status(research_id, "completed")
                await self._broadcast_progress(research_id, "system", "research_complete")
                
                total_time = time.time() - start_time
                logger.info(f"Research {research_id} completed successfully in {total_time:.2f}s")
                return context.final_report
            else:
                raise ValueError("Pipeline completed but no final report was generated in context")
                
        except Exception as e:
            logger.exception(f"Research {research_id} failed catastrophically: {e}")
            await self._update_status(research_id, "failed", error=str(e))
            await self._broadcast_progress(research_id, "system", "error", error=str(e))
            return None
    
    async def _update_status(self, research_id: str, status: str, error: Optional[str] = None) -> None:
        """Update research state in the database.
        
        Args:
            research_id: The ID of the research session.
            status: New status string.
            error: Optional error message if status is 'failed'.
        """
        try:
            async with AsyncSessionLocal() as db:
                result = await db.execute(select(Research).where(Research.id == research_id))
                research = result.scalar_one_or_none()
                if research:
                    research.status = status
                    if error:
                        research.error_message = error
                    if status == "completed":
                        research.completed_at = datetime.now(timezone.utc)
                    await db.commit()
                else:
                    logger.warning(f"Could not update status: Research {research_id} not found")
        except Exception as e:
            logger.error(f"Failed to update status for {research_id}: {e}")
    
    async def _save_report(self, research_id: str, context: AgentContext) -> None:
        """Persist the final report to the database.
        
        Args:
            research_id: The research session ID.
            context: The agent context containing the final report.
        """
        if not context.final_report:
            return
            
        try:
            async with AsyncSessionLocal() as db:
                report = Report(
                    research_id=research_id,
                    content=context.final_report.full_markdown,
                    confidence_score=context.final_report.confidence_score,
                    metadata_json={
                        "title": context.final_report.title,
                        "references": context.final_report.references,
                        "sources_count": len(context.search_results) if hasattr(context, 'search_results') else 0,
                        "document_chunks_count": len(context.document_chunks) if hasattr(context, 'document_chunks') else 0,
                        "critique": {
                            "strengths": context.critique.strengths if context.critique else [],
                            "weaknesses": context.critique.weaknesses if context.critique else [],
                            "contradictions": context.critique.contradictions if context.critique else [],
                        } if context.critique else None,
                    },
                )
                db.add(report)
                await db.commit()
        except Exception as e:
            logger.error(f"Failed to save report for {research_id}: {e}")
            raise
    
    async def _broadcast_progress(
        self, 
        research_id: str, 
        agent_name: str, 
        status: str,
        elapsed_time: Optional[float] = None, 
        preview_data: Optional[Dict[str, Any]] = None,
        error: Optional[str] = None
    ) -> None:
        """Dispatch progress updates via WebSocket connections.
        
        Errors here are suppressed so they don't break the main pipeline.
        """
        try:
            from app.api.websocket import manager
            message = {
                "type": f"agent_{status}" if status != "research_complete" else "research_complete",
                "agent_name": agent_name,
                "status": status,
            }
            
            if elapsed_time is not None:
                message["elapsed_time"] = elapsed_time
            if preview_data is not None:
                message["preview_data"] = preview_data
            if error is not None:
                message["error"] = error
                
            await manager.broadcast(research_id, message)
        except Exception as e:
            # WebSocket failures should not interrupt the core research pipeline
            logger.debug(f"Ignored WebSocket broadcast failure for {research_id}: {e}")
    
    def _get_preview(self, agent_name: str, data: Any) -> Optional[Dict[str, Any]]:
        """Extract a succinct summary of agent output for frontend rendering."""
        if data is None:
            return None
        
        try:
            if agent_name == "planner" and hasattr(data, "subtasks"):
                return {"subtask_count": len(data.subtasks), "goal": data.goal[:200] if hasattr(data, 'goal') else ""}
            elif agent_name == "search" and isinstance(data, list):
                return {"result_count": len(data)}
            elif agent_name == "document" and isinstance(data, list):
                return {"chunk_count": len(data)}
            elif agent_name == "retriever" and isinstance(data, list):
                return {"merged_count": len(data)}
            elif agent_name == "summarizer" and hasattr(data, "key_findings"):
                return {"finding_count": len(data.key_findings), "fact_count": len(data.facts) if hasattr(data, 'facts') else 0}
            elif agent_name == "critic" and hasattr(data, "confidence_score"):
                return {"confidence": data.confidence_score, "contradiction_count": len(data.contradictions) if hasattr(data, 'contradictions') else 0}
            elif agent_name == "report" and hasattr(data, "full_markdown"):
                return {"report_length": len(data.full_markdown), "confidence": getattr(data, 'confidence_score', None)}
        except Exception as e:
            logger.debug(f"Failed to generate preview for {agent_name}: {e}")
            
        return None
