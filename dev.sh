#!/bin/bash

# QC-Leap Development Server
# Optimized for WSL2 environments

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Project configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
PID_FILE="$PROJECT_ROOT/.dev_pids"
BACKEND_LOG="$PROJECT_ROOT/backend.log"
FRONTEND_LOG="$PROJECT_ROOT/frontend.log"
CELERY_LOG="$PROJECT_ROOT/celery.log"
REDIS_LOG="$PROJECT_ROOT/redis.log"

# Port configuration
BACKEND_PORT=8000
FRONTEND_PORT=3100
POSTGRES_PORT=5433
REDIS_PORT=6379

# Database configuration (from backend/.env)
DB_NAME="qc_leap_db"
DB_USER="qc_leap_user"
DB_PASSWORD="QcL3ap_S3cur3_P@ssw0rd_2024"

# Print banner
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  QC-Leap Development Server${NC}"
echo -e "${BLUE}  WSL2 Optimized Edition${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Utility functions
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${CYAN}ℹ${NC} $1"
}

# Check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if a service is running
check_service() {
    if pgrep -x "$1" > /dev/null; then
        return 0
    else
        return 1
    fi
}

# Wait for HTTP service to be ready (WSL2 compatible)
wait_for_http() {
    local port=$1
    local max_wait=${2:-60}
    local waited=0

    print_info "Waiting for port $port to respond (max ${max_wait}s)..."

    while [ $waited -lt $max_wait ]; do
        # Use curl to check if service is responding
        if curl -s --connect-timeout 1 http://localhost:$port > /dev/null 2>&1; then
            return 0
        fi

        sleep 1
        waited=$((waited + 1))
    done

    return 1
}

# Kill processes on a specific port
kill_port() {
    local port=$1
    print_info "Cleaning up port $port..."

    # Kill WSL processes
    lsof -ti:$port 2>/dev/null | xargs kill -9 2>/dev/null || true

    # Kill Windows processes (critical for WSL2 on /mnt/c/)
    powershell.exe -Command "Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force" 2>/dev/null || true

    sleep 1
}

# Cleanup function
cleanup() {
    echo ""
    print_info "Shutting down services..."

    # Kill tracked PIDs
    if [ -f "$PID_FILE" ]; then
        while IFS= read -r pid; do
            if kill -0 $pid 2>/dev/null; then
                kill $pid 2>/dev/null || true
            fi
        done < "$PID_FILE"
        rm -f "$PID_FILE"
    fi

    # Clean up ports
    kill_port $BACKEND_PORT
    kill_port $FRONTEND_PORT

    # Kill Celery workers
    pkill -f "celery.*worker" 2>/dev/null || true

    print_status "Cleanup complete"
    exit 0
}

# Set up trap for Ctrl+C
trap cleanup INT TERM

# Clear old state
rm -f "$PID_FILE"
rm -f "$FRONTEND_DIR/.next/dev/lock" 2>/dev/null || true

# ============================================
# Prerequisites Check
# ============================================
echo "Checking prerequisites..."
echo ""

# Check Python
if ! command_exists python3; then
    print_error "Python 3 not found. Please install Python 3.10+"
    exit 1
fi
print_status "Python 3 installed ($(python3 --version))"

# Check virtual environment
if [ ! -d "$BACKEND_DIR/.venv" ]; then
    print_error "Virtual environment not found"
    print_info "Run: cd backend && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt"
    exit 1
fi
print_status "Virtual environment found"

# Check Node.js and npm
if ! command_exists node; then
    print_error "Node.js not found. Please install Node.js 18+"
    exit 1
fi
print_status "Node.js installed ($(node --version))"

if ! command_exists npm; then
    print_error "npm not found. Please install npm"
    exit 1
fi
print_status "npm installed ($(npm --version))"

# ============================================
# PostgreSQL Check
# ============================================
echo ""
print_info "Checking PostgreSQL..."

if ! check_service "postgres"; then
    print_warning "PostgreSQL not running. Attempting to start..."
    sudo service postgresql start 2>/dev/null || {
        print_error "Failed to start PostgreSQL"
        print_info "Start it manually with: sudo service postgresql start"
        exit 1
    }
    sleep 2
fi

if check_service "postgres"; then
    print_status "PostgreSQL is running"
else
    print_error "PostgreSQL is not running"
    exit 1
fi

# Check if database exists safely from /tmp
if (cd /tmp && sudo -u postgres psql -lqt) | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    print_status "Database '$DB_NAME' exists"
else
    print_warning "Database not found. Creating..."
    (cd /tmp && sudo -u postgres psql << EOF
CREATE DATABASE $DB_NAME;
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
EOF
)
    print_status "Database created"
fi

# ============================================
# Redis Check and Start
# ============================================
echo ""
print_info "Checking Redis..."
if check_service "redis-server"; then
    print_status "Redis is running"
else
    print_warning "Redis not running. Attempting to start..."
    if command_exists redis-server; then
        nohup redis-server --port $REDIS_PORT > "$REDIS_LOG" 2>&1 &
        REDIS_PID=$!
        echo $REDIS_PID >> "$PID_FILE"
        sleep 2
        if check_service "redis-server"; then
            print_status "Redis started successfully"
        else
            print_error "Failed to start Redis"
            print_warning "ML training tasks will not work without Redis"
        fi
    else
        print_warning "Redis not installed. Install with: sudo apt-get install redis-server"
        print_warning "ML training tasks will not work without Redis"
    fi
fi

# ============================================
# Port Cleanup
# ============================================
echo ""
print_info "Cleaning up ports..."
kill_port $BACKEND_PORT
kill_port $FRONTEND_PORT
print_status "Ports cleaned up"

# ============================================
# Start Backend
# ============================================
echo ""
print_info "Starting backend server..."
cd "$BACKEND_DIR"

# Activate virtual environment and start backend
source .venv/bin/activate
nohup uvicorn app.main:app --host 0.0.0.0 --port $BACKEND_PORT --reload > "$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID >> "$PID_FILE"

# Wait for backend to be ready
if wait_for_http $BACKEND_PORT 30; then
    print_status "Backend server running on http://localhost:$BACKEND_PORT"
    print_info "API Docs: http://localhost:$BACKEND_PORT/api/v1/docs"
else
    print_error "Backend failed to start"
    print_error "Check $BACKEND_LOG for details:"
    tail -n 20 "$BACKEND_LOG"
    cleanup
fi

# ============================================
# Start Celery Worker
# ============================================
echo ""
print_info "Starting Celery worker for ML tasks..."
cd "$BACKEND_DIR"

# Check if Redis is accessible
if redis-cli -p $REDIS_PORT ping > /dev/null 2>&1; then
    # CRITICAL: Kill any existing Celery workers to prevent conflicts
    pkill -9 -f "celery.*worker" 2>/dev/null || true
    sleep 2

    # Start Celery worker with FORCED solo pool for CUDA compatibility
    # The celery_app.py config already sets worker_pool='solo', but we also
    # pass --pool=solo as a safeguard against any config override
    export PYTHONPATH="$BACKEND_DIR:$PYTHONPATH"

    print_info "Starting with solo pool (CUDA-compatible, no forking)..."
    nohup python3 -m celery -A app.ml.celery_app worker --pool=solo --concurrency=1 --loglevel=info > "$CELERY_LOG" 2>&1 &
    CELERY_PID=$!
    echo $CELERY_PID >> "$PID_FILE"

    # Give Celery a moment to start
    sleep 5

    # Verify solo pool is being used
    if ps aux | grep -v grep | grep "celery.*worker" | grep -q "solo"; then
        print_status "Celery worker started with SOLO POOL (CUDA-compatible) ✓"
    else
        print_warning "Could not verify solo pool - check $CELERY_LOG"
    fi

    # Check if Celery started successfully
    if PYTHONPATH="$BACKEND_DIR" python3 -m celery -A app.ml.celery_app inspect registered > /dev/null 2>&1; then
        print_status "Celery worker running (3 ML tasks registered)"
    else
        print_warning "Celery worker may have issues (check $CELERY_LOG)"
    fi
else
    print_warning "Redis not accessible - Celery worker not started"
    print_warning "ML training tasks will not work"
fi

# ============================================
# Start Frontend
# ============================================
echo ""
print_info "Starting Next.js frontend..."
cd "$FRONTEND_DIR"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    print_info "Installing frontend dependencies (first time setup)..."
    npm install > "$FRONTEND_LOG" 2>&1
    print_status "Dependencies installed"
fi

# Start frontend
nohup npm run dev > "$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID >> "$PID_FILE"

# Wait for frontend to be ready
if wait_for_http $FRONTEND_PORT 90; then
    print_status "Frontend server running on http://localhost:$FRONTEND_PORT"
else
    print_error "Frontend failed to start"
    print_error "Check $FRONTEND_LOG for details:"
    tail -n 30 "$FRONTEND_LOG"
    cleanup
fi

# ============================================
# Health Checks
# ============================================
echo ""
print_info "Running health checks..."
sleep 2

# Backend health check
if curl -s http://localhost:$BACKEND_PORT/api/v1/health > /dev/null 2>&1; then
    print_status "Backend health check passed"
else
    if curl -s http://localhost:$BACKEND_PORT > /dev/null 2>&1; then
        print_warning "Backend responding but health endpoint not available"
    else
        print_warning "Backend health check failed"
    fi
fi

# Frontend health check
if curl -s http://localhost:$FRONTEND_PORT > /dev/null 2>&1; then
    print_status "Frontend health check passed"
else
    print_warning "Frontend health check failed (may still be compiling)"
fi

# ============================================
# Success!
# ============================================
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  All services started successfully!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  ${CYAN}Frontend:${NC} http://localhost:$FRONTEND_PORT"
echo -e "  ${CYAN}Backend:${NC}  http://localhost:$BACKEND_PORT"
echo -e "  ${CYAN}API Docs:${NC} http://localhost:$BACKEND_PORT/api/v1/docs"
echo ""
echo -e "${YELLOW}Logs:${NC}"
echo -e "  Backend:  $BACKEND_LOG"
echo -e "  Frontend: $FRONTEND_LOG"
echo -e "  Celery:   $CELERY_LOG"
if [ -f "$REDIS_LOG" ]; then
    echo -e "  Redis:    $REDIS_LOG"
fi
echo ""
echo -e "${YELLOW}Services:${NC}"
ps aux | grep -E "(uvicorn|celery.*worker|redis-server)" | grep -v grep | awk '{print "  " $11 " (PID: " $2 ")"}'
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for user interrupt
wait
