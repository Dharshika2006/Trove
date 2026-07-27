import time
import logging
from abc import ABC, abstractmethod
from typing import Any, Optional
from dataclasses import dataclass, field
from app.agents.models import AgentContext, AgentResult

logger = logging.getLogger(__name__)

class BaseAgent(ABC):
    """Abstract base class for all research agents.
    
    Every agent extends this class and implements the `execute` method.
    The `run` method wraps `execute` with timing, logging, and error handling.
    """
    
    name: str = "base_agent"
    description: str = "Base agent"
    
    @abstractmethod
    async def execute(self, context: AgentContext) -> AgentResult:
        """Execute the agent's core logic. Implemented by each agent."""
        ...
    
    async def run(self, context: AgentContext) -> AgentResult:
        """Run the agent with timing, logging, and error handling."""
        start_time = time.time()
        logger.info(f"Agent '{self.name}' starting execution")
        
        try:
            result = await self.execute(context)
            elapsed = time.time() - start_time
            result.execution_time = elapsed
            result.agent_name = self.name
            
            logger.info(
                f"Agent '{self.name}' completed in {elapsed:.2f}s "
                f"(tokens: {result.tokens_used})"
            )
            return result
            
        except Exception as e:
            elapsed = time.time() - start_time
            logger.error(f"Agent '{self.name}' failed after {elapsed:.2f}s: {e}")
            return AgentResult(
                agent_name=self.name,
                success=False,
                error=str(e),
                execution_time=elapsed,
            )
