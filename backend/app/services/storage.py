import os
import uuid
import logging
from abc import ABC, abstractmethod
from typing import Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

class StorageBackend(ABC):
    """Abstract interface for file storage.
    
    Implementations must provide mechanisms for saving, retrieving, 
    deleting, and checking existence of arbitrary binary payloads.
    """
    
    @abstractmethod
    async def save(self, content: bytes, filename: str, user_id: str) -> str:
        """Save file contents and return a unique storage path/URI."""
        pass
    
    @abstractmethod
    async def get(self, path: str) -> bytes:
        """Retrieve file contents given its path/URI."""
        pass
    
    @abstractmethod
    async def delete(self, path: str) -> None:
        """Permanently remove a file."""
        pass
    
    @abstractmethod
    async def exists(self, path: str) -> bool:
        """Determine if a file exists at the given path/URI."""
        pass


class LocalStorage(StorageBackend):
    """Local filesystem implementation of the storage backend.
    
    Organizes files into directories by user_id and prepends UUIDs
    to prevent naming collisions.
    """
    
    def __init__(self, base_dir: Optional[str] = None) -> None:
        """Initialize local storage.
        
        Args:
            base_dir: Optional custom base directory. Defaults to settings.upload_dir.
        """
        self.base_dir = base_dir or getattr(settings, 'upload_dir', './uploads')
        try:
            os.makedirs(self.base_dir, exist_ok=True)
            logger.info(f"LocalStorage initialized at {os.path.abspath(self.base_dir)}")
        except Exception as e:
            logger.error(f"Failed to create base storage directory {self.base_dir}: {e}")
            raise
    
    async def save(self, content: bytes, filename: str, user_id: str) -> str:
        """Save a file to the local filesystem.
        
        Creates a unique filename and places it within a user-specific folder.
        """
        # Sanitize filename to prevent directory traversal or invalid characters
        safe_name = self._sanitize_filename(filename)
        unique_name = f"{uuid.uuid4().hex[:8]}_{safe_name}"
        
        # Isolate user files in their own directory
        user_dir = os.path.join(self.base_dir, self._sanitize_filename(user_id))
        
        try:
            os.makedirs(user_dir, exist_ok=True)
            file_path = os.path.join(user_dir, unique_name)
            
            with open(file_path, "wb") as f:
                f.write(content)
            
            logger.info(f"Saved file: {file_path} ({len(content)} bytes)")
            return file_path
        except IOError as e:
            logger.error(f"IOError saving file {filename} for user {user_id}: {e}")
            raise RuntimeError(f"Failed to save file: {e}")
    
    async def get(self, path: str) -> bytes:
        """Read a file's binary contents from disk."""
        try:
            with open(path, "rb") as f:
                return f.read()
        except FileNotFoundError:
            logger.error(f"File not found: {path}")
            raise
        except IOError as e:
            logger.error(f"IOError reading file {path}: {e}")
            raise
    
    async def delete(self, path: str) -> None:
        """Delete a file from disk if it exists."""
        try:
            if os.path.exists(path):
                os.remove(path)
                logger.info(f"Deleted file: {path}")
            else:
                logger.debug(f"Attempted to delete non-existent file: {path}")
        except Exception as e:
            logger.error(f"Failed to delete {path}: {e}")
            # Depending on use-case, might want to raise here, but for now we log and proceed
    
    async def exists(self, path: str) -> bool:
        """Check if a file exists on disk."""
        return os.path.exists(path) and os.path.isfile(path)
    
    def _sanitize_filename(self, filename: str) -> str:
        """Remove unsafe characters to prevent path traversal and invalid names.
        
        Only allows alphanumeric characters, dots, hyphens, and underscores.
        """
        if not filename:
            return "unnamed"
            
        safe = "".join(
            c if c.isalnum() or c in ".-_" else "_" for c in filename
        )
        return safe or "unnamed"
