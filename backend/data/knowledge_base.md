# QC-Leap Knowledge Base

## Summary
QC-Leap is an AI-powered quality control platform that addresses the data barrier preventing Indian MSMEs from adopting AI for visual inspection. The system uses Copy-Paste augmentation to synthesize realistic defect images from minimal annotated samples, then trains a lightweight MobileNetV3 classifier for real-time defect detection. This approach empowers MSMEs to build powerful quality control solutions without requiring large datasets or deep technical expertise.

## Problem Context
Automated visual inspection is essential for Industry 4.0, offering improvements in product quality, waste reduction, and efficiency. While large enterprises have adopted AI-powered inspection systems, this technology remains inaccessible to most Indian MSMEs due to critical limitations:

**Primary Obstacle: Data Requirements**
Traditional computer vision models require vast, labeled datasets - often thousands of images capturing every defect type from multiple angles and lighting conditions. For MSMEs, this means:
- Halting production to collect samples
- Manual sorting and expert labeling
- High costs and logistical burden
- Lack of specialized equipment and infrastructure

QC-Leap solves this by requiring only a small set of annotated defect images (50-100 samples) to generate a production-ready inspection model.

## Proposed Solution

QC-Leap uses a two-stage pipeline that separates data generation from defect detection:

### Stage 1: Copy-Paste Data Synthesizer
**Purpose:** Overcome data scarcity by generating realistic synthetic defect images

**Process:**
1. Users upload annotated defect images with PNG masks highlighting defect regions
2. System extracts defect patches using the annotation masks
3. Copy-Paste augmentation pastes these defects onto clean product images
4. Poisson blending ensures seamless, realistic integration
5. Heavy augmentation (rotation, flip, brightness, contrast) creates diverse variations

**Key Features:**
- Generates hundreds to thousands of synthetic defective images
- Automatic class balancing (1:1 normal:defective ratio)
- Sanity checking prevents training on mismatched data
- No human validation required (unlike GAN approaches)

### Stage 2: MobileNetV3 Classifier
**Purpose:** Fast, accurate defect detection optimized for resource-constrained environments

**Architecture:**
- MobileNetV3-Small pre-trained on ImageNet
- Binary classification (normal vs defective)
- Lightweight design suitable for 4GB GPU or CPU inference
- Early stopping prevents overfitting
- Learning rate scheduling for optimal convergence

**Training Features:**
- Automatic class weighting for imbalanced data
- Regularization (weight decay + dropout)
- Real-time progress tracking via Server-Sent Events
- Achieves production-ready accuracy with minimal data

## Data Strategy

**Training Process:**
1. **Upload**: 50-100 annotated defect images + clean normal images
2. **Sanity Check**: Validates images are from the same product class
3. **Synthesis**: Generates 500-2000 synthetic defective images
4. **Balancing**: Augments normal images to match defective count
5. **Training**: MobileNetV3 trains with early stopping (typically 10-20 epochs)
6. **Validation**: 20% held-out validation set ensures generalization

**Performance Metrics:**
- Accuracy, Precision, Recall, F1-score
- Emphasis on high recall (minimize false negatives)
- Typical validation accuracy: 85-95% on industrial datasets

## Application Design

### Dashboard
Central hub displaying all inspection models as cards showing:
- Model name and creation date
- Current status (Training, Ready, Failed)
- Validation accuracy
- Quick actions (Train, Inspect, Delete)

### Model Creation Wizard
Multi-step guided process:
1. **Name & Description**: Basic model information
2. **Image Upload**:
   - Normal images (clean products)
   - Defective images (products with defects)
   - Annotation masks (PNG files highlighting defect regions)
3. **Configuration**:
   - Number of synthetic images to generate
   - Training parameters (auto-configured by default)
4. **Launch Training**: Automated pipeline with real-time progress

### Training Progress
Real-time monitoring with:
- Progress bar (0-100%)
- Current stage (Defect Extraction, Synthesis, Balancing, Training)
- Live logs streaming via SSE
- Estimated time remaining
- Validation metrics during training

### Inspection Interface
Once trained, models enable:
- **Single Image Inspection**: Upload one image, get instant result
- **Batch Inspection**: Upload multiple images or ZIP file
- **Results Display**:
  - Classification (Defective/Normal)
  - Confidence score (0-100%)
  - Visual highlighting of predictions
- **Export**: Download results as CSV for record-keeping

### AI Chatbot
Integrated assistant (powered by GPT-4o-mini) provides:
- Personalized guidance based on user's models
- Answers about training status and performance
- Troubleshooting help
- Best practices for image capture

## Technical Architecture

**Backend:**
- FastAPI (Python 3.11+)
- PostgreSQL database
- Redis (caching + Celery broker)
- Celery for background ML training
- PyTorch for model training

**ML Pipeline:**
- Albumentations for augmentation
- OpenCV for image processing
- MobileNetV3 (torchvision.models)
- Automatic mixed precision training

**Frontend:**
- Next.js 14 (React)
- TypeScript
- Tailwind CSS
- Real-time updates via SSE

## Key Differentiators

1. **No Large Dataset Required**: 50-100 annotated images sufficient
2. **Realistic Synthesis**: Copy-Paste with Poisson blending (not GANs)
3. **Automatic Balancing**: Prevents class imbalance automatically
4. **Fast Training**: Typically completes in 10-30 minutes
5. **Lightweight Model**: Runs on CPU or 4GB GPU
6. **No Manual Validation**: Fully automated pipeline
7. **Multi-Tenant SaaS**: B2B platform supporting multiple companies

## Use Cases

**Supported Industries:**
- Food processing (cashew grading, packaged goods inspection)
- Manufacturing (component defect detection)
- Textiles (fabric defect identification)
- Electronics (PCB inspection, component verification)

**Typical Workflow:**
1. MSME captures 50-100 defect samples during production
2. Annotates defect regions using simple image editing tool
3. Uploads to QC-Leap platform
4. System generates training data and trains model (automated)
5. Deploys model for real-time inspection
6. Integrates with production line for automated QC

## Performance & Limitations

**Strengths:**
- Works with minimal data (50-100 samples)
- Fast training and inference
- High accuracy on structured defects
- Low computational requirements
- Easy to use for non-technical users

**Limitations:**
- Requires annotation masks for defects
- Best for surface defects (scratches, spots, cracks)
- May struggle with highly variable defect types
- Requires consistent imaging conditions
