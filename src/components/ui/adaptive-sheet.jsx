"use client";
// ─────────────────────────────────────────────────────────────────────────────
// AdaptiveSheet — side inspector panel / drawer
//
// Desktop  → Radix Sheet (right / left slide-in panel, full-height)
// Mobile   → AdaptiveOverlay bottom sheet (lg size = 80 dvh)
//
// Use for: settings panels, filter sidebars, detail inspectors, help drawers
// ─────────────────────────────────────────────────────────────────────────────

import * as React from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { X, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { AdaptiveOverlay } from "./adaptive-overlay";

// Width config for desktop side panel
const SHEET_WIDTH = {
  sm:   "max-w-xs",   // 320px — narrow helper/filter panel
  md:   "max-w-sm",   // 384px — standard inspector (default)
  lg:   "max-w-md",   // 448px — wide inspector / settings
  xl:   "max-w-lg",   // 512px — very wide panel
  full: "w-full",     // full width (e.g. mobile-width on desktop)
};

// ── Desktop side panel (Radix Sheet) ─────────────────────────────────────────
function DesktopSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  side = "right",
  size = "md",
  onBack,
  showClose = true,
  className,
}) {
  const hasHeader = !!(title || description || onBack || showClose);

  const slideIn =
    side === "right"
      ? "data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right"
      : "data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left";

  return (
    <SheetPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <SheetPrimitive.Portal>
        {/* Backdrop */}
        <SheetPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-[200]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "duration-300",
          )}
          style={{
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(2px)",
            WebkitBackdropFilter: "blur(2px)",
          }}
        />

        {/* Panel */}
        <SheetPrimitive.Content
          className={cn(
            "fixed inset-y-0 z-[210] flex flex-col",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:duration-300 data-[state=open]:duration-500",
            slideIn,
            side === "right" ? "right-0" : "left-0",
            "w-full",
            SHEET_WIDTH[size] ?? SHEET_WIDTH.md,
            className,
          )}
          style={{
            background: "var(--hf-panel-strong)",
            borderLeft:
              side === "right"
                ? "1px solid var(--hf-border)"
                : undefined,
            borderRight:
              side === "left"
                ? "1px solid var(--hf-border)"
                : undefined,
            boxShadow: "var(--hf-shadow)",
            backdropFilter: "blur(30px) saturate(150%)",
            WebkitBackdropFilter: "blur(30px) saturate(150%)",
          }}
        >
          {/* Header */}
          {hasHeader && (
            <div
              className="flex items-center gap-3 px-6 py-4 flex-shrink-0"
              style={{ borderBottom: "1px solid var(--hf-border)" }}
            >
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="flex items-center justify-center w-8 h-8 rounded-lg opacity-70 hover:opacity-100 transition-opacity flex-shrink-0"
                  style={{ background: "var(--hf-surface-2)" }}
                  aria-label="Go back"
                >
                  <ChevronLeft
                    className="h-4 w-4"
                    style={{ color: "var(--hf-text)" }}
                  />
                </button>
              )}
              <div className="flex-1 min-w-0">
                {title && (
                  <SheetPrimitive.Title
                    className="text-base font-bold truncate"
                    style={{ color: "var(--hf-text)" }}
                  >
                    {title}
                  </SheetPrimitive.Title>
                )}
                {description && (
                  <SheetPrimitive.Description
                    className="text-xs mt-0.5"
                    style={{ color: "var(--hf-text-muted)" }}
                  >
                    {description}
                  </SheetPrimitive.Description>
                )}
              </div>
              {showClose && (
                <SheetPrimitive.Close
                  className="flex items-center justify-center w-8 h-8 rounded-lg opacity-60 hover:opacity-100 transition-opacity flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hf-lemon)]"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" style={{ color: "var(--hf-text)" }} />
                </SheetPrimitive.Close>
              )}
            </div>
          )}

          {/* Hidden a11y */}
          {!hasHeader && (
            <>
              <SheetPrimitive.Title className="sr-only">
                Panel
              </SheetPrimitive.Title>
              <SheetPrimitive.Description className="sr-only">
                Side panel overlay
              </SheetPrimitive.Description>
            </>
          )}

          {/* Body */}
          <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div
              className="px-6 py-4 flex-shrink-0"
              style={{
                borderTop: "1px solid var(--hf-border)",
                background: "var(--hf-surface)",
              }}
            >
              {footer}
            </div>
          )}
        </SheetPrimitive.Content>
      </SheetPrimitive.Portal>
    </SheetPrimitive.Root>
  );
}

// ── Public API ────────────────────────────────────────────────────────────────
/**
 * AdaptiveSheet — side inspector panel on desktop, bottom sheet on mobile.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {(open: boolean) => void} props.onOpenChange
 * @param {React.ReactNode} [props.title]
 * @param {React.ReactNode} [props.description]
 * @param {React.ReactNode} props.children
 * @param {React.ReactNode} [props.footer]
 * @param {'right'|'left'} [props.side='right']   Desktop side (ignored on mobile)
 * @param {'sm'|'md'|'lg'|'xl'|'full'} [props.size='md']
 * @param {() => void} [props.onBack]
 * @param {boolean} [props.showClose=true]
 * @param {string} [props.className]
 */
export function AdaptiveSheet({ size = "md", ...props }) {
  const isMobile = useIsMobile();

  if (isMobile) {
    // Map sheet size → overlay size (sheets are typically lg on mobile)
    const mobileSize = size === "full" ? "full" : size === "xl" ? "xl" : "lg";
    return (
      <AdaptiveOverlay
        size={mobileSize}
        showClose
        {...props}
      />
    );
  }

  return <DesktopSheet size={size} {...props} />;
}

export default AdaptiveSheet;
