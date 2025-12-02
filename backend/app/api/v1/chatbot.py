from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.deps import get_current_active_user
from app.database import get_db
from app.models.user import User
from app.services.llm_service import chat, ChatRequest

router = APIRouter()


@router.post("/chat")
def chat_with_bot(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Chat with Jemih, the QC-Leap AI assistant with full context awareness.

    Jemih has access to:
    - Your user profile and company information
    - All your models and their current status
    - Active and historical training jobs
    - Image upload statistics
    - Model performance metrics
    - Personalized system recommendations

    Ask questions like:
    - "How many models do I have?"
    - "What's the status of my latest training?"
    - "Which is my best performing model?"
    - "How many defective images did I upload?"
    - "What should I do next?"
    """
    return chat(request, db=db, user=current_user)


@router.get("/health")
def chatbot_health(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Check if chatbot is available"""
    import os
    from dotenv import load_dotenv

    load_dotenv()
    api_key = os.getenv("OPENAI_API_KEY")

    return {
        "available": bool(api_key),
        "message": "Chatbot is ready" if api_key else "OpenAI API key not configured"
    }
