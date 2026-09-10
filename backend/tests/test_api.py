import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    response = await client.get('/health')
    assert response.status_code == 200
    assert response.json() == {'status': 'healthy', 'service': 'trove-backend'}

@pytest.mark.asyncio
async def test_get_me(client: AsyncClient, mock_user):
    response = await client.get('/auth/me')
    assert response.status_code == 200
    data = response.json()
    assert data['id'] == mock_user.id
    assert data['email'] == mock_user.email
    assert data['name'] == mock_user.name
    
@pytest.mark.asyncio
async def test_start_research_mocked(client: AsyncClient, mocker):
    # Mock the background task orchestrator so it doesn't actually run LLMs
    mocker.patch('app.services.orchestrator.ResearchOrchestrator.run_research')
    
    payload = {
        'question': 'What is the capital of France?',
        'depth': 'quick'
    }
    response = await client.post('/research/start', json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data['question'] == 'What is the capital of France?'
    assert data['status'] == 'pending'
    assert 'id' in data

@pytest.mark.asyncio
async def test_get_research_history(client: AsyncClient, mocker):
    response = await client.get('/research/history/list')
    assert response.status_code == 200
    data = response.json()
    assert 'items' in data
    assert 'total' in data
    assert type(data['items']) == list
