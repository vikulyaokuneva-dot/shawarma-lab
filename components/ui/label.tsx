import * as React from "react";

import { cn } from "@/lib/utils";

const Label = React.forwardRef<
  HTMLLabelElement,
  React.ComponentPropsWithoutRef<"label">
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      "block text-sm font-medium leading-none text-white/70",
      className,
    )}
    {...props}
  />
));
Label.displayName = "Label";

export { Label };
