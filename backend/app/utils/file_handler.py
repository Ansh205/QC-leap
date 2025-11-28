import os
import shutil
from pathlib import Path
from typing import Optional
from fastapi import UploadFile
import uuid
from datetime import datetime


class FileHandler:
    def __init__(self, base_upload_dir: str = "uploads"):
        self.base_upload_dir = Path(base_upload_dir)
        self._ensure_directories()

    def _ensure_directories(self):
        """Create necessary directories if they don't exist"""
        directories = [
            self.base_upload_dir / "raw_images",
            self.base_upload_dir / "synthetic_images",
            self.base_upload_dir / "models",
            self.base_upload_dir / "temp",
        ]
        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)

    def save_uploaded_file(
        self,
        file: UploadFile,
        subfolder: str,
        custom_filename: Optional[str] = None
    ) -> str:
        """Save uploaded file and return the path"""
        if custom_filename:
            filename = custom_filename
        else:
            # Generate unique filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            unique_id = str(uuid.uuid4())[:8]
            ext = Path(file.filename).suffix
            filename = f"{timestamp}_{unique_id}{ext}"

        file_path = self.base_upload_dir / subfolder / filename

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        return str(file_path)

    def delete_file(self, file_path: str) -> bool:
        """Delete a file"""
        try:
            path = Path(file_path)
            if path.exists():
                path.unlink()
                return True
            return False
        except Exception as e:
            print(f"Error deleting file: {e}")
            return False

    def get_file_path(self, subfolder: str, filename: str) -> str:
        """Get full file path"""
        return str(self.base_upload_dir / subfolder / filename)


# Global instance
file_handler = FileHandler()
