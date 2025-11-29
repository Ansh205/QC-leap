"""
Celery application for background ML training tasks
"""
from celery import Celery
import os
import multiprocessing

# Set multiprocessing start method to 'spawn' for CUDA compatibility
# This must be done before importing torch or creating any CUDA contexts
try:
    multiprocessing.set_start_method('spawn', force=True)
except RuntimeError:
    # Already set, ignore
    pass

from app.core.config import settings

# Redis connection for Celery broker and backend
REDIS_URL = settings.REDIS_URL

# Create Celery app
celery_app = Celery(
    'qc_leap',
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=['app.ml.tasks']
)

# Celery configuration
# CRITICAL: Force 'solo' pool for CUDA compatibility (no multiprocessing/forking)
# The default 'prefork' pool is incompatible with CUDA and will cause SIGKILL errors
celery_app.conf.update(
    # Pool configuration - MUST use solo for CUDA
    worker_pool='solo',
    worker_concurrency=1,

    # Serialization
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',

    # Timezone
    timezone='UTC',
    enable_utc=True,

    # Task tracking and limits
    task_track_started=True,
    task_send_sent_event=True,
    task_time_limit=3600 * 4,  # 4 hours max per task

    # Worker configuration
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1,  # Restart after each task to free CUDA memory
    worker_disable_rate_limits=True,

    # Broker
    broker_connection_retry_on_startup=True,
)
