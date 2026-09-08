"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Sheet (выезжающая панель) на базе Radix Dialog — как в shadcn/ui.
 * Появляется справа, работает с клавиатуры: Esc закрывает, Tab ловится в фокус-ловушку.
 */

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    data-slot="sheet-overlay"
    className={cn("fixed inset-0 z-50 bg-black/70", className)}
    {...props}
  />
));
SheetOverlay.displayName = "SheetOverlay";

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  /** Показывать ли стандартную кнопку закрытия в углу. */
  hideCloseButton?: boolean;
}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  SheetContentProps
>(({ className, children, hideCloseButton, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <SheetOverlay />
    <DialogPrimitive.Content
      ref={ref}
      data-slot="sheet-panel"
      className={cn(
        "fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-md flex-col border-l border-white/10 bg-surface shadow-[0_0_80px_rgba(0,0,0,0.6)] outline-none",
        className,
      )}
      {...props}
    >
      {children}
      {!hideCloseButton && (
        <DialogPrimitive.Close
          className="absolute right-4 top-[22px] flex size-9 items-center justify-center rounded-lg text-white/50 transition-colors outline-none hover:bg-white/[0.06] hover:text-white focus-visible:ring-2 focus-visible:ring-accent"
          aria-label="Закрыть панель заказа"
        >
          <X className="size-5" aria-hidden />
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
SheetContent.displayName = "SheetContent";

const SheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex items-center gap-2 border-b border-white/[0.07] px-6 py-5 pr-16",
      className,
    )}
    {...props}
  />
);

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-bold tracking-tight text-white", className)}
    {...props}
  />
));
SheetTitle.displayName = "SheetTitle";

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-white/45", className)}
    {...props}
  />
));
SheetDescription.displayName = "SheetDescription";

const SheetBody = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-1 flex-col overflow-hidden", className)} {...props} />
);

const SheetFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "border-t border-white/[0.07] px-6 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]",
      className,
    )}
    {...props}
  />
);

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetFooter,
};
