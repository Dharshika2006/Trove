import logging
import json
from typing import Dict, List, Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)

websocket_router = APIRouter()

class ConnectionManager:
    """Manages WebSocket connections for real-time state synchronization."""
    
    def __init__(self) -> None:
        # Maps research_id -> list of active WebSocket connections
        self.active_connections: Dict[str, List[WebSocket]] = {}
    
    async def connect(self, research_id: str, websocket: WebSocket) -> None:
        """Establish and track a new WebSocket connection.
        
        Args:
            research_id: The ID of the session the client is observing.
            websocket: The FastAPI WebSocket instance.
        """
        await websocket.accept()
        if research_id not in self.active_connections:
            self.active_connections[research_id] = []
        self.active_connections[research_id].append(websocket)
        logger.info(f"WebSocket connected for research {research_id}. Total connections: {len(self.active_connections[research_id])}")
    
    def disconnect(self, research_id: str, websocket: WebSocket) -> None:
        """Untrack a WebSocket connection on disconnect."""
        if research_id in self.active_connections:
            self.active_connections[research_id] = [
                ws for ws in self.active_connections[research_id] if ws != websocket
            ]
            if not self.active_connections[research_id]:
                del self.active_connections[research_id]
                logger.debug(f"Removed empty connection list for research {research_id}")
        logger.info(f"WebSocket disconnected for research {research_id}")
    
    async def broadcast(self, research_id: str, message: Dict[str, Any]) -> None:
        """Push a JSON message to all clients observing a specific research session.
        
        Args:
            research_id: The session ID.
            message: The JSON-serializable dictionary to broadcast.
        """
        if research_id not in self.active_connections:
            return
        
        disconnected_clients = []
        
        for websocket in self.active_connections[research_id]:
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.warning(f"Failed to send message to a client for {research_id}: {e}")
                disconnected_clients.append(websocket)
        
        # Clean up connections that threw errors (likely broken pipes)
        for ws in disconnected_clients:
            self.disconnect(research_id, ws)

# Singleton connection manager to be used across the application
manager = ConnectionManager()

@websocket_router.websocket("/ws/research/{research_id}")
async def research_websocket(websocket: WebSocket, research_id: str) -> None:
    """WebSocket endpoint for bi-directional communication.
    
    Currently handles sending progress updates and responding to keep-alive pings.
    """
    await manager.connect(research_id, websocket)
    try:
        # Keep connection alive — listen for client messages (ping/pong)
        while True:
            data = await websocket.receive_text()
            
            # Simple ping-pong to keep proxies from terminating idle connections
            if data == "ping":
                await websocket.send_json({"type": "pong"})
            else:
                try:
                    # Optional: handle JSON commands from client
                    parsed = json.loads(data)
                    logger.debug(f"Received command from client {research_id}: {parsed}")
                except json.JSONDecodeError:
                    pass
                
    except WebSocketDisconnect:
        logger.info(f"Client disconnected normally from {research_id}")
        manager.disconnect(research_id, websocket)
    except Exception as e:
        logger.error(f"WebSocket error for research {research_id}: {e}")
        manager.disconnect(research_id, websocket)
