import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-primary/20 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-b from-blue-600 to-blue-700 text-white shadow-md shadow-blue-500/25 border border-blue-600/20 hover:from-blue-500 hover:to-blue-600 hover:shadow-lg hover:shadow-blue-500/30 hover:border-blue-500/50",
        destructive:
          "bg-gradient-to-b from-red-600 to-red-700 text-white shadow-md shadow-red-500/20 border border-red-600/20 hover:from-red-500 hover:to-red-600 hover:shadow-lg hover:shadow-red-500/30",
        outline:
          "border-slate-200 bg-white/50 backdrop-blur-sm text-slate-700 shadow-sm hover:bg-white hover:text-slate-900 hover:border-slate-300 hover:shadow-md",
        secondary:
          "bg-white/80 text-slate-700 backdrop-blur-md border border-white/40 shadow-sm hover:bg-white hover:shadow-md hover:text-blue-600",
        ghost:
          "text-slate-600 hover:bg-slate-100/50 hover:text-slate-900",
        link: "text-blue-600 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5 text-xs",
        lg: "h-10 rounded-lg px-6 has-[>svg]:px-4 text-base",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }