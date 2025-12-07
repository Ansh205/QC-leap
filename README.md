# QC-Leap

**Software Engineering Project - September 2025 Term - Team 20**

QC-Leap is a comprehensive dashboard application for managing AI Inspection Models. It combines a robust Python/FastAPI backend for ML training and inference with a modern Next.js/React frontend for a seamless user experience.

## � Project Structure

This project is organized into two main directories:

- **`backend/`**: Contains the FastAPI server, ML pipelines (MobileNetV3, Copy-Paste Augmentation), database models, and Celery workers.
- **`frontend/`**: Contains the Next.js application, React components, and UI logic.

## 🛠️ Getting Started

To run the application, you need to set up and run both the backend and the frontend.

### Backend Setup

The backend handles data management, model training, and inference.

👉 **[Read the Backend README](./backend/README.md)** for detailed installation, configuration (environment variables), and running instructions.

**Quick Summary:**

1.  Navigate to `backend/`.
2.  Create and activate a virtual environment.
3.  Install dependencies: `pip install -r requirements.txt`.
4.  Configure `.env`.
5.  Run server: `uvicorn app.main:app --reload`.
6.  Run Celery worker (for ML tasks).

### Frontend Setup

The frontend provides the user interface for managing models, viewing results, and system administration.

👉 **[Read the Frontend README](./frontend/README.md)** for development server commands and build instructions.

**Quick Summary:**

1.  Navigate to `frontend/`.
2.  Install dependencies: `npm install`.
3.  Run development server: `npm run dev`.
4.  Access at `http://localhost:3000`.
