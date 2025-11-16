# QC-Leap Backend

AI-powered quality control system for manufacturing defect detection using Copy-Paste augmentation and MobileNetV3.

## Architecture

**Tech Stack:**
- **Framework**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Cache**: Redis for session management and Celery broker
- **Task Queue**: Celery for background ML training
- **ML Pipeline**:
  - Copy-Paste Augmentation (Albumentations + OpenCV)
  - MobileNetV3-Small classifier (PyTorch)
  - Data balancing with automatic augmentation
  - Early stopping and learning rate scheduling

**Key Features:**
- Multi-tenant B2B SaaS architecture
- Real-time training progress via Server-Sent Events (SSE)
- Automatic class balancing (1:1 ratio)
- Sanity checking to prevent mismatched data
- AI chatbot with dynamic context (GPT-4o-mini)
- RESTful API with JWT authentication

## ML Pipeline Overview

1. **Data Upload**: Users upload normal and defective images with annotation masks
2. **Sanity Check**: Validates that normal/defective images are from the same class (cosine similarity)
3. **Defect Extraction**: Extracts defect patches from annotated images using masks
4. **Synthetic Generation**: Copy-paste augmentation with Poisson blending creates realistic defective images
5. **Class Balancing**: Automatically augments normal images to match defective count (1:1 ratio)
6. **Training**: MobileNetV3-Small with early stopping, LR scheduler, and regularization
7. **Inference**: Real-time defect detection with confidence scores

## Installation

### Prerequisites
- Python 3.11+
- PostgreSQL 15+
- Redis 7+
- CUDA (optional, for GPU acceleration)

### Setup

1. **Clone and navigate:**
```bash
cd backend
```

2. **Create virtual environment:**
```bash
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

3. **Install dependencies:**
```bash
pip install -r requirements.txt
```

4. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your credentials
```

Required `.env` variables:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/qc_leap_db
SECRET_KEY=your-secret-key-min-32-chars
REDIS_URL=redis://localhost:6379/0
```

5. **Initialize database:**
```bash
# Database will auto-create tables on first run
python -m app.main
```

## Running the Application

### Option 1: Docker Compose (Recommended)

```bash
docker-compose up -d
```

Access:
- API: http://localhost:8000
- API Docs: http://localhost:8000/api/v1/docs

### Option 2: Manual

**Terminal 1 - FastAPI Server:**
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 - Celery Worker:**
```bash
celery -A app.ml.celery_app worker --loglevel=info
```

**Terminal 3 - Redis (if not using Docker):**
```bash
redis-server
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new company
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/refresh` - Refresh JWT token

### Models
- `POST /api/v1/models` - Create inspection model
- `GET /api/v1/models` - List user's models
- `GET /api/v1/models/{id}` - Get model details
- `POST /api/v1/models/{id}/start-training` - Start training
- `GET /api/v1/models/{id}/progress/stream` - SSE progress stream
- `POST /api/v1/models/{id}/predict` - Single image prediction
- `POST /api/v1/models/{id}/predict-batch` - Batch prediction

### Images
- `POST /api/v1/images/{model_id}/upload` - Upload images
- `POST /api/v1/images/{model_id}/upload-zip` - Upload ZIP
- `POST /api/v1/images/{model_id}/upload-masks` - Upload annotation masks
- `GET /api/v1/images/{id}/file` - Serve image file

### Chatbot
- `POST /api/v1/chatbot/chat` - Chat with AI assistant

## Training Configuration

Default training parameters in `mobilenet_service.py`:
- **Model**: MobileNetV3-Small (pre-trained on ImageNet)
- **Epochs**: 30 (with early stopping, patience=5)
- **Batch Size**: 16
- **Learning Rate**: 1e-4 (AdamW optimizer)
- **Regularization**: Weight decay (1e-4), Dropout (0.5)
- **LR Scheduler**: ReduceLROnPlateau (patience=2, factor=0.1)
- **Image Size**: 224x224
- **Validation Split**: 20%

## Project Structure

```
backend/
├── app/
│   ├── api/v1/           # API endpoints
│   ├── core/             # Config, security, dependencies
│   ├── ml/               # ML services (copy-paste, MobileNetV3, sanity check)
│   ├── models/           # SQLAlchemy models
│   ├── schemas/          # Pydantic schemas
│   ├── services/         # Business logic
│   └── utils/            # Utilities
├── uploads/              # User uploaded images (gitignored)
├── model_weights/        # Trained model checkpoints (gitignored)
├── .env                  # Environment variables (gitignored)
├── docker-compose.yml    # Docker orchestration
└── requirements.txt      # Python dependencies
```

## Key ML Services

### `copy_paste_service.py`
- Extracts defect patches from annotated images
- Generates synthetic defective images using Poisson blending
- Heavy augmentation (rotation, flip, brightness, contrast)

### `mobilenet_service.py`
- MobileNetV3-Small binary classifier (normal vs defective)
- Early stopping based on validation loss
- Learning rate scheduling
- Class weighting for imbalanced data

### `normal_balancer.py`
- Automatically augments normal images to match defective count
- Prevents class imbalance (ensures 1:1 ratio)
- Uses Albumentations for diverse transformations

### `sanity_check.py`
- Validates that normal and defective images are from same class
- Uses MobileNetV3 feature extraction + cosine similarity
- Prevents training on mismatched data (e.g., cashews vs fryums)

## Deployment

1. **Set production environment variables**
2. **Use PostgreSQL and Redis in production (not SQLite/in-memory)**
3. **Enable HTTPS**
4. **Configure CORS for your frontend domain**
5. **Set strong SECRET_KEY (min 32 characters)**
6. **Use Gunicorn/Uvicorn workers behind Nginx**

Example production command:
```bash
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

## Troubleshooting

**Celery not processing tasks:**
- Ensure Redis is running
- Check Celery worker logs
- Verify REDIS_URL in .env

**Training fails with CUDA errors:**
- Install PyTorch with CUDA support: `pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118`
- Or run on CPU (slower but works): Model automatically falls back to CPU

**Images not displaying:**
- Check file permissions on `uploads/` directory
- Verify image paths in database match filesystem
- Ensure frontend API_URL is correct

**Database connection errors:**
- Verify PostgreSQL is running
- Check DATABASE_URL in .env
- Ensure database exists and user has permissions


