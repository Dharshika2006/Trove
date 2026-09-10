import pytest
from app.services.orchestrator import ResearchOrchestrator
from app.db.models import Research

@pytest.mark.asyncio
async def test_orchestrator_initialization():
    orchestrator = ResearchOrchestrator()
    assert orchestrator is not None

@pytest.mark.asyncio
async def test_orchestrator_mocked_run(mocker, db_session, mock_user):
    # Create a dummy research
    research = Research(
        user_id=mock_user.id,
        question='What is quantum computing?',
        depth='quick',
        status='pending'
    )
    db_session.add(research)
    await db_session.commit()
    await db_session.refresh(research)
    
    orchestrator = ResearchOrchestrator()
    
    # Mock _run_agent to avoid actually running agents and populate context
    async def mock_run_agent(research_id, status_name, agent_name, agent, context):
        if agent_name == "report":
            context.final_report = "Mocked final report"
        return True
        
    mocker.patch.object(orchestrator, '_run_agent', new=mock_run_agent)
    
    # Mock DB operations to use the current test session directly
    async def mock_update_status(res_id, status, error=None):
        research.status = status
        db_session.add(research)
        await db_session.commit()
        
    async def mock_save_report(*args, **kwargs):
        pass
        
    mocker.patch.object(orchestrator, '_update_status', new=mock_update_status)
    mocker.patch.object(orchestrator, '_save_report', new=mock_save_report)
    
    # Run
    await orchestrator.run_research(research.id, research.question, research.depth, None)
    
    # Verify status changed
    await db_session.refresh(research)
    assert research.status == 'completed'
