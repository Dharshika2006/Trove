import time
import logging
from typing import AsyncIterator, Optional
from dataclasses import dataclass, field
import litellm
from app.core.config import settings

logger = logging.getLogger(__name__)

# Suppress LiteLLM's verbose logging
litellm.suppress_debug_info = True

@dataclass
class LLMResponse:
    """Standardized response from any LLM provider."""
    content: str
    model: str
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    latency_ms: float = 0.0

class LLMClient:
    """Unified LLM interface via LiteLLM.
    
    Supports OpenAI, Anthropic, Groq, and Gemini through a single API.
    All agents use this class for LLM calls.
    """
    
    def __init__(self, default_model: Optional[str] = None):
        self.default_model = default_model or settings.default_model
        self._setup_api_keys()
    
    def _setup_api_keys(self):
        """Set API keys in environment for LiteLLM."""
        import os
        if settings.openai_api_key:
            os.environ["OPENAI_API_KEY"] = settings.openai_api_key
        if settings.anthropic_api_key:
            os.environ["ANTHROPIC_API_KEY"] = settings.anthropic_api_key
        if settings.groq_api_key:
            os.environ["GROQ_API_KEY"] = settings.groq_api_key
        if settings.gemini_api_key:
            os.environ["GEMINI_API_KEY"] = settings.gemini_api_key
    
    async def complete(
        self,
        messages: list[dict],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        **kwargs,
    ) -> LLMResponse:
        """Send completion request to configured LLM."""
        model = model or self.default_model
        start_time = time.time()
        
        max_retries = 2
        for attempt in range(max_retries + 1):
            try:
                response = await litellm.acompletion(
                    model=model,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    **kwargs,
                )
                
                latency = (time.time() - start_time) * 1000
                usage = response.usage or {}
                
                result = LLMResponse(
                    content=response.choices[0].message.content or "",
                    model=model,
                    prompt_tokens=getattr(usage, "prompt_tokens", 0),
                    completion_tokens=getattr(usage, "completion_tokens", 0),
                    total_tokens=getattr(usage, "total_tokens", 0),
                    latency_ms=latency,
                )
                
                logger.info(
                    f"LLM call: model={model}, tokens={result.total_tokens}, latency={latency:.0f}ms"
                )
                return result
                
            except litellm.RateLimitError as e:
                if attempt < max_retries:
                    wait_time = 25 * (attempt + 1)
                    logger.warning(f"Rate limit hit. Retrying in {wait_time}s... (Attempt {attempt+1}/{max_retries})")
                    import asyncio
                    await asyncio.sleep(wait_time)
                else:
                    logger.error(f"LLM call failed after {max_retries} retries: model={model}, error={e}")
                    raise
            except Exception as e:
                logger.error(f"LLM call failed: model={model}, error={e}")
                raise
    
    async def complete_json(
        self,
        messages: list[dict],
        model: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 4096,
    ) -> dict:
        """Get structured JSON response from LLM.
        
        Appends instruction to return valid JSON and parses the response.
        """
        import json
        
        # Add JSON instruction to the last message or system message
        json_messages = messages.copy()
        json_messages.append({
            "role": "user",
            "content": "IMPORTANT: Respond with valid JSON only. No markdown, no code blocks, just raw JSON.",
        })
        
        response = await self.complete(
            messages=json_messages,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            response_format={"type": "json_object"},
        )
        
        try:
            # Try parsing directly
            return json.loads(response.content)
        except json.JSONDecodeError:
            # Try extracting JSON from markdown code blocks
            content = response.content.strip()
            if content.startswith("```"):
                lines = content.split("\n")
                content = "\n".join(lines[1:-1]) if len(lines) > 2 else content
            return json.loads(content)
    
    async def stream(
        self,
        messages: list[dict],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> AsyncIterator[str]:
        """Stream completion response."""
        model = model or self.default_model
        
        response = await litellm.acompletion(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True,
        )
        
        async for chunk in response:
            content = chunk.choices[0].delta.content
            if content:
                yield content


# Singleton instance
_llm_client: Optional[LLMClient] = None

def get_llm_client() -> LLMClient:
    global _llm_client
    if _llm_client is None:
        _llm_client = LLMClient()
    return _llm_client
