import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // UPDATED: Semi-transparent background, subtle border, smooth focus transition
        "flex h-9 w-full min-w-0 rounded-lg border border-slate-200/60 bg-white/50 backdrop-blur-sm px-3 py-1 text-sm text-slate-900 shadow-sm transition-all duration-200",
        "placeholder:text-slate-400 selection:bg-blue-100 selection:text-blue-900",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "focus:bg-white focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 focus:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:ring-red-500/20 aria-invalid:border-red-500/50",
        className
      )}
      {...props}
    />
  )
}

export { Input }