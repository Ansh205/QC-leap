from fastapi import APIRouter
from app.api.v1 import auth, users, inspection_models, health, images, annotations, invitations, company, notifications, stats, chatbot, runs

api_router = APIRouter()

api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(company.router, prefix="/company", tags=["company"])
api_router.include_router(invitations.router, prefix="/invitations", tags=["invitations"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(inspection_models.router, prefix="/models", tags=["inspection-models"])
api_router.include_router(images.router, prefix="/images", tags=["images"])
api_router.include_router(annotations.router, prefix="/annotations", tags=["annotations"])
api_router.include_router(stats.router, prefix="/stats", tags=["stats"])
api_router.include_router(chatbot.router, prefix="/chatbot", tags=["chatbot"])
api_router.include_router(runs.router, tags=["runs"])
