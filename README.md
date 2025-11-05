# soft-engg-project-sep-2025-se-SEP-20
Software Engineering Project - September 2025 Term - Team 20

# QC-Leap

This project is a dashboard application for managing AI Inspection Models, built using **Next.js** and **React**. It utilizes **Tailwind CSS** for utility-first styling and **Radix UI** primitives for accessible components, ensuring a modern and responsive user experience.

## 📦 Installation

To set up the project locally, ensure you have **Node.js** (LTS version recommended) installed on your system.

1.  **Clone the Repository (If applicable) and Navigate:**

    ```bash
    git clone https://github.com/kushabarodekar/soft-engg-project-sep-2025-se-SEP-20.git  
    cd soft-engg-project-sep-2025-se-SEP-20
    ```

2.  **Install Dependencies:**
    Run the following command in your terminal to download all required packages:

    ```bash
    npm install
    npm install next-themes sonner
    ```

## ▶️ Running the Application

To start the development server, which compiles the application and enables hot reloading:

```bash
npm run dev
```

The application will be accessible at:

### **`http://localhost:3000`**


## 🗺️ Route to File Mapping

| **Route**              | **Main Files Used**                                                  |
|-------------------------|---------------------------------------------------------------------|
| `/`                    | `src/app/page.tsx`, `src/app/layout.tsx`                            |
| `/models`              | `src/app/(user)/layout.tsx`, `src/app/(user)/models/page.tsx`        |
| `/models/QCL-1`, `/models/QCL-1?step=sample_images`, `/models/QCL-1?step=generated_images`, `/models/QCL-1?step=training`        | `src/app/(user)/models/[modelId]/page.tsx`                           |
| `/models/QCL-1/runs`   | `src/app/(user)/models/[modelId]/runs/page.tsx`                     |
| `/invitation`                     |`src/app/(user)/layout.tsx, src/app/(user)/invitations/page.tsx`
| `/account`                     |`src/app/(user)/layout.tsx, src/app/(user)/account/page.tsx`