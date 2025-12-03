from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from app.core.config import settings
from app.core.cache import cache
from app.api.v1.router import api_router
from app.database import engine, Base

print("DEBUG: MAIN.PY IMPORTED - FILES ARE SYNCED", flush=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    print(f"🚀 Starting {settings.PROJECT_NAME} v{settings.VERSION}")
    print(f"DEBUG: API Prefix is {settings.API_V1_PREFIX}")
    print("DEBUG: HELLO FROM AGENT - IF YOU SEE THIS, FILES ARE SYNCED")
    Base.metadata.create_all(bind=engine)
    print("✓ Database tables created")

    # Redis is initialized on import, just check status
    if cache.is_available():
        print("✓ Redis cache ready")
    else:
        print("⚠ Running without Redis cache")

    yield

    # Shutdown
    print("👋 Shutting down...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    docs_url=f"{settings.API_V1_PREFIX}/docs",
    redoc_url=f"{settings.API_V1_PREFIX}/redoc",
    lifespan=lifespan,
)


# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

 # Add validation error handler
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    print(f"VALIDATION ERROR on {request.url}:", flush=True)
    print(f"Errors: {exc.errors()}", flush=True)
    print(f"Body: {exc.body}", flush=True)
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": exc.body}
    )

# Include API router
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/")
def root():
    """Root endpoint"""
    return {
        "message": f"Welcome to {settings.PROJECT_NAME} API",
        "version": settings.VERSION,
        "docs": f"{settings.API_V1_PREFIX}/docs"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
    # Force reload trigger - DB Reset
