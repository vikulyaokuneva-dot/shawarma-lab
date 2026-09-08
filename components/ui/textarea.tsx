import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentPropsWithoutRef<"textarea">
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-[84px] w-full resize-none rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-3 text-[15px] text-white transition-colors outline-none placeholder:text-white/30 hover:border-white/20 focus-visible:border-accent/60 focus-visible:ring-2 focus-visible:ring-accent/30",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export { Textarea };
