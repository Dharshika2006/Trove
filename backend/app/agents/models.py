from dataclasses import dataclass, field
from typing import Any, Optional
from datetime import datetime


@dataclass
class AgentContext:
    """Shared context passed between agents through the orchestrator."""
    question: str = ""
    depth: str = "standard"  # quick, standard, deep
    research_id: str = ""
    
    # Planner output
    research_plan: Optional["ResearchPlan"] = None
    
    # Search results
    search_results: list["WebSearchResult"] = field(default_factory=list)
    
    # Document chunks from uploaded files
    document_chunks: list["DocumentChunk"] = field(default_factory=list)
    document_ids: list[str] = field(default_factory=list)
    
    # Retrieved content (merged search + documents)
    retrieved_content: list["RetrievalResult"] = field(default_factory=list)
    
    # Summary
    summary: Optional["Summary"] = None
    
    # Critique
    critique: Optional["Critique"] = None
    
    # Final report
    final_report: Optional["FinalReport"] = None


@dataclass
class AgentResult:
    """Standard output from any agent."""
    agent_name: str = ""
    success: bool = True
    data: Any = None
    error: Optional[str] = None
    execution_time: float = 0.0
    tokens_used: int = 0


# ---- Planner Agent Types ----

@dataclass
class ResearchPlan:
    """Output of the Planner Agent."""
    goal: str = ""
    rewritten_question: str = ""
    subtasks: list[str] = field(default_factory=list)
    priorities: list[str] = field(default_factory=list)  # high, medium, low for each subtask
    estimated_sources: list[str] = field(default_factory=list)  # web, academic, news, government, etc.
    research_scope: str = ""  # Brief description of scope


# ---- Search Agent Types ----

@dataclass
class WebSearchResult:
    """A single web search result."""
    title: str = ""
    url: str = ""
    snippet: str = ""
    content: str = ""  # Full extracted content if available
    published_date: Optional[str] = None
    relevance_score: float = 0.0
    source_type: str = "web"  # web, academic, news, government
    credibility_score: float = 0.5  # 0.0 to 1.0


# ---- Document Agent Types ----

@dataclass
class DocumentChunk:
    """A chunk of text from an uploaded document."""
    content: str = ""
    document_id: str = ""
    filename: str = ""
    page: Optional[int] = None
    section: Optional[str] = None
    chunk_index: int = 0
    total_chunks: int = 0


# ---- Retriever Agent Types ----

@dataclass
class RetrievalResult:
    """A single retrieved piece of content with source info."""
    content: str = ""
    source_title: str = ""
    source_url: str = ""  # URL or filename
    source_type: str = "web"  # web, document, academic
    relevance_score: float = 0.0
    metadata: dict = field(default_factory=dict)


# ---- Summarizer Agent Types ----

@dataclass
class Summary:
    """Output of the Summarizer Agent."""
    key_findings: list[str] = field(default_factory=list)
    facts: list[dict] = field(default_factory=list)  # {"fact": str, "source": str, "source_url": str}
    statistics: list[dict] = field(default_factory=list)  # {"stat": str, "source": str}
    quotes: list[dict] = field(default_factory=list)  # {"quote": str, "author": str, "source": str}
    source_references: list[dict] = field(default_factory=list)  # {"title": str, "url": str, "type": str}


# ---- Critic Agent Types ----

@dataclass
class Critique:
    """Output of the Critic Agent."""
    strengths: list[str] = field(default_factory=list)
    weaknesses: list[str] = field(default_factory=list)
    contradictions: list[dict] = field(default_factory=list)  # {"claim1": str, "claim2": str, "sources": list}
    unsupported_claims: list[str] = field(default_factory=list)
    
    # Raw LLM evaluation fields
    source_evaluations: list[dict] = field(default_factory=list)
    contradiction_severity: float = 0.0
    core_claims_supported_ratio: float = 1.0
    perspectives_covered: int = 1
    total_perspectives_needed: int = 3
    
    # Deterministic scores
    evidence_confidence: float = 0.5  # 0.0 to 1.0
    research_coverage: float = 0.5    # 0.0 to 1.0
    
    recommendations: list[str] = field(default_factory=list)
    source_quality_assessment: str = ""


# ---- Report Generator Types ----

@dataclass
class FinalReport:
    """Output of the Report Generator Agent."""
    title: str = ""
    executive_summary: str = ""
    research_question: str = ""
    methodology: str = ""
    evidence: str = ""
    arguments_for: str = ""
    arguments_against: str = ""
    key_statistics: str = ""
    source_comparison: str = ""
    limitations: str = ""
    confidence_score: float = 0.5
    coverage_score: float = 0.5
    references: list[dict] = field(default_factory=list)  # {"index": int, "title": str, "url": str, "type": str}
    full_markdown: str = ""  # Complete formatted report
