import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<
  HTMLInputElement,
  React.ComponentPropsWithoutRef<"input">
>(({ className, type = "text", ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={cn(
      "h-11 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3.5 text-[15px] text-white transition-colors outline-none placeholder:text-white/30 hover:border-white/20 focus-visible:border-accent/60 focus-visible:ring-2 focus-visible:ring-accent/30 aria-[invalid=true]:border-hot/70",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

export { Input };
