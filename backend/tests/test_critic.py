import pytest
from app.agents.critic import CriticAgent

def test_quick_with_authoritative_agreeing_sources():
    agent = CriticAgent()
    source_evals = [
        {"authority": 0.95, "is_primary_or_independent": True},
        {"authority": 0.90, "is_primary_or_independent": True}
    ]
    confidence, coverage = agent._calculate_scores(
        source_evals=source_evals,
        contradiction_severity=0.0,
        claims_ratio=1.0,
        perspectives_covered=1,
        perspectives_needed=3,
        depth="quick"
    )
    # Base: 0.95. 2nd independent: +0.05. Total: 1.0
    assert confidence >= 0.90
    assert coverage <= 0.7  # Capped by quick

def test_quick_with_weak_sources():
    agent = CriticAgent()
    source_evals = [
        {"authority": 0.4, "is_primary_or_independent": True},
        {"authority": 0.3, "is_primary_or_independent": True}
    ]
    confidence, coverage = agent._calculate_scores(
        source_evals=source_evals,
        contradiction_severity=0.0,
        claims_ratio=1.0,
        perspectives_covered=1,
        perspectives_needed=3,
        depth="quick"
    )
    # Base: 0.4. No independent bonus (since auth < 0.5)
    assert confidence <= 0.4

def test_standard_with_many_weak_sources():
    agent = CriticAgent()
    source_evals = [
        {"authority": 0.4, "is_primary_or_independent": True} for _ in range(10)
    ]
    confidence, coverage = agent._calculate_scores(
        source_evals=source_evals,
        contradiction_severity=0.1,
        claims_ratio=0.8,
        perspectives_covered=3,
        perspectives_needed=3,
        depth="standard"
    )
    # Base: 0.4. No independent bonus since they are weak (<0.5).
    # Some contradiction/unsupported penalty.
    assert confidence < 0.4
    assert coverage == 1.0

def test_deep_with_conflicting_authoritative_sources():
    agent = CriticAgent()
    source_evals = [
        {"authority": 0.9, "is_primary_or_independent": True},
        {"authority": 0.9, "is_primary_or_independent": True}
    ]
    confidence, coverage = agent._calculate_scores(
        source_evals=source_evals,
        contradiction_severity=0.8, # high severity
        claims_ratio=1.0,
        perspectives_covered=4,
        perspectives_needed=4,
        depth="deep"
    )
    # Base: 0.9. Bonus: +0.05 = 0.95.
    # Contradiction penalty: -0.8 * 0.4 = -0.32
    assert confidence < 0.7
    assert coverage == 1.0

def test_multiple_sources_copying_same_source():
    agent = CriticAgent()
    source_evals = [
        {"authority": 0.8, "is_primary_or_independent": True},
        {"authority": 0.8, "is_primary_or_independent": False},
        {"authority": 0.8, "is_primary_or_independent": False},
        {"authority": 0.8, "is_primary_or_independent": False}
    ]
    confidence, coverage = agent._calculate_scores(
        source_evals=source_evals,
        contradiction_severity=0.0,
        claims_ratio=1.0,
        perspectives_covered=2,
        perspectives_needed=4,
        depth="standard"
    )
    # Base: 0.8. Bonus: 0 (since only 1 is independent).
    assert confidence == 0.80

def test_strong_evidence_limited_coverage():
    agent = CriticAgent()
    source_evals = [
        {"authority": 0.95, "is_primary_or_independent": True}
    ]
    confidence, coverage = agent._calculate_scores(
        source_evals=source_evals,
        contradiction_severity=0.0,
        claims_ratio=1.0,
        perspectives_covered=1,
        perspectives_needed=5,
        depth="standard"
    )
    assert confidence >= 0.90
    assert coverage == 0.2
