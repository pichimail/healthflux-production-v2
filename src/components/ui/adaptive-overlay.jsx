"use client";
// ─────────────────────────────────────────────────────────────────────────────
// AdaptiveOverlay — unified modal / bottom-sheet
//
// Desktop  → Radix Dialog (centered, glassy, focus-trapped, ESC-dismissible)
// Mobile   → vaul Drawer  (snap-point bottom sheet, drag handle, safe-area)
//
// Size  │ Mobile snap │ Desktop max-w      │ Auto show close/back
// ──────┼─────────────┼────────────────────┼─────────────────────
//  sm   │  40 dvh     │ max-w-sm  (384px)  │ no
//  md   │  60 dvh     │ max-w-xl  (576px)  │ no  (swipe-dismiss)
//  lg   │  80 dvh     │ max-w-2xl (672px)  │ yes
//  xl   │  92 dvh     │ max-w-4xl (896px)  │ yes
//  full │ 100 dvh     │ full-screen        │ yes (no drag handle)
// ─────────────────────────────────────────────────────────────────────────────

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Drawer as DrawerPrimitive } from "vaul";
import { X, ChevronLeft, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useBottomSheet } from "@/lib/BottomSheetContext";
import Haptics from "@/components/utils/haptics";

// ── Size config ───────────────────────────────────────────────────────────────
const SIZE_MAP = {
  sm:   { snap: 0.40, desktopMaxW: "sm:max-w-sm",    autoControls: false },
  md:   { snap: 0.60, desktopMaxW: "sm:max-w-xl",    autoControls: false },
  lg:   { snap: 0.80, desktopMaxW: "sm:max-w-2xl",   autoControls: true  },
  xl:   { snap: 0.92, desktopMaxW: "sm:max-w-4xl",   autoControls: true  },
  full: { snap: 1,    desktopMaxW: "",                autoControls: true  },
};

// ── Shared primitives ─────────────────────────────────────────────────────────
function DragHandle() {
  return (
    <div
      className="mx-auto mt-3 mb-0 h-1.5 w-10 rounded-full flex-shrink-0 pointer-events-none"
      style={{ background: "var(--hf-border-strong)" }}
      aria-hidden="true"
    />
  );
}

function LoadingBody() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <Loader2
        className="h-8 w-8 animate-spin"
        style={{ color: "var(--hf-lemon)" }}
      />
      <p className="text-sm" style={{ color: "var(--hf-text-muted)" }}>
        Loading…
      </p>
    </div>
  );
}

function ErrorBody({ error }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center"
        style={{ background: "rgba(242,140,140,0.15)" }}
      >
        <AlertCircle
          className="h-6 w-6"
          style={{ color: "var(--hf-coral-strong)" }}
        />
      </div>
      <p className="text-sm font-semibold" style={{ color: "var(--hf-text)" }}>
        Something went wrong
      </p>
      <p className="text-xs" style={{ color: "var(--hf-text-muted)" }}>
        {error}
      </p>
    </div>
  );
}

// ── Mobile variant (vaul Drawer) ──────────────────────────────────────────────
function MobileOverlay({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "md",
  loading = false,
  error = null,
  onBack,
  showClose,
  mobileClassName,
  dismissible = true,
}) {
  const { openSheet, closeSheet } = useBottomSheet();
  const cfg = SIZE_MAP[size] ?? SIZE_MAP.md;
  const snapPoints = [cfg.snap];
  const isFullScreen = size === "full";
  const showControls = cfg.autoControls || showClose || !!onBack;
  const hasHeader = !!(title || description || showControls);

  // Keep BottomSheetContext in sync (e.g. hides FAB while sheet is open)
  React.useEffect(() => {
    if (!open) return undefined;
    openSheet();
    Haptics.light();
    return () => closeSheet();
  }, [open, openSheet, closeSheet]);

  return (
    <DrawerPrimitive.Root
      open={open}
      onOpenChange={onOpenChange}
      snapPoints={snapPoints}
      shouldScaleBackground={isFullScreen}
      dismissible={dismissible && !loading}
    >
      <DrawerPrimitive.Portal>
        {/* Backdrop */}
        <DrawerPrimitive.Overlay
          className="fixed inset-0 z-[200]"
          style={{
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(2px)",
            WebkitBackdropFilter: "blur(2px)",
          }}
        />

        {/* Sheet content */}
        <DrawerPrimitive.Content
          aria-describedby={description ? "ao-mob-desc" : undefined}
          className={cn(
            "fixed inset-x-0 bottom-0 z-[210] flex flex-col outline-none",
            "border-t",
            isFullScreen ? "top-0 rounded-none" : "rounded-t-[24px]",
            mobileClassName,
          )}
          style={{
            background: "var(--hf-panel-strong)",
            borderColor: "var(--hf-border)",
            maxHeight: isFullScreen ? "100dvh" : `${cfg.snap * 100}dvh`,
            backdropFilter: "blur(30px) saturate(150%)",
            WebkitBackdropFilter: "blur(30px) saturate(150%)",
          }}
        >
          {/* Drag handle (not on full-screen) */}
          {!isFullScreen && <DragHandle />}

          {/* Header */}
          {hasHeader && (
            <div
              className="flex items-center gap-3 px-5 py-3 flex-shrink-0"
              style={{ borderBottom: "1px solid var(--hf-border)" }}
            >
              {onBack && (
                <button
                  type="button"
                  onClick={() => { Haptics.light(); onBack(); }}
                  className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0 active-press"
                  style={{ background: "var(--hf-surface-2)" }}
                  aria-label="Go back"
                >
                  <ChevronLeft
                    className="h-5 w-5"
                    style={{ color: "var(--hf-text)" }}
                  />
                </button>
              )}
              <div className="flex-1 min-w-0">
                {title && (
                  <DrawerPrimitive.Title
                    className="text-base font-bold truncate"
                    style={{ color: "var(--hf-text)" }}
                  >
                    {title}
                  </DrawerPrimitive.Title>
                )}
                {description && (
                  <DrawerPrimitive.Description
                    id="ao-mob-desc"
                    className="text-xs mt-0.5"
                    style={{ color: "var(--hf-text-muted)" }}
                  >
                    {description}
                  </DrawerPrimitive.Description>
                )}
              </div>
              {showControls && (
                <button
                  type="button"
                  onClick={() => { Haptics.light(); onOpenChange(false); }}
                  className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0 active-press"
                  style={{ background: "var(--hf-surface-2)" }}
                  aria-label="Close"
                >
                  <X
                    className="h-4 w-4"
                    style={{ color: "var(--hf-text-muted)" }}
                  />
                </button>
              )}
            </div>
          )}

          {/* Hidden a11y — required when no visible header */}
          {!hasHeader && (
            <>
              <DrawerPrimitive.Title className="sr-only">
                Dialog
              </DrawerPrimitive.Title>
              <DrawerPrimitive.Description className="sr-only">
                Content overlay
              </DrawerPrimitive.Description>
            </>
          )}

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto overscroll-contain min-h-0 px-5 pt-4 pb-2">
            {loading ? <LoadingBody /> : error ? <ErrorBody error={error} /> : children}
          </div>

          {/* Sticky footer */}
          {footer && (
            <div
              className="px-5 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] flex-shrink-0"
              style={{
                borderTop: "1px solid var(--hf-border)",
                background: "var(--hf-surface)",
              }}
            >
              {footer}
            </div>
          )}
        </DrawerPrimitive.Content>
      </DrawerPrimitive.Portal>
    </DrawerPrimitive.Root>
  );
}

// ── Desktop variant (Radix Dialog) ────────────────────────────────────────────
function DesktopOverlay({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "md",
  loading = false,
  error = null,
  onBack,
  showClose = true,
  className,
}) {
  const cfg = SIZE_MAP[size] ?? SIZE_MAP.md;
  const isFullScreen = size === "full";
  const hasHeader = !!(title || description || onBack || showClose);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        {/* Backdrop */}
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-[200]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "duration-200",
          )}
          style={{
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(2px)",
            WebkitBackdropFilter: "blur(2px)",
          }}
        />

        {/* Dialog panel */}
        <DialogPrimitive.Content
          aria-describedby={description ? "ao-desk-desc" : undefined}
          className={cn(
            "fixed left-1/2 top-1/2 z-[210] -translate-x-1/2 -translate-y-1/2",
            "flex flex-col overflow-hidden",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "duration-200",
            isFullScreen
              ? "w-screen h-screen rounded-none"
              : cn(
                  "w-[calc(100vw-2rem)] max-h-[90vh] rounded-2xl",
                  cfg.desktopMaxW,
                ),
            className,
          )}
          style={{
            background: "var(--hf-panel-strong)",
            border: "1px solid var(--hf-border)",
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
                  className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors hover:opacity-100 opacity-70 flex-shrink-0"
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
                  <DialogPrimitive.Title
                    className="text-lg font-bold truncate"
                    style={{ color: "var(--hf-text)" }}
                  >
                    {title}
                  </DialogPrimitive.Title>
                )}
                {description && (
                  <DialogPrimitive.Description
                    id="ao-desk-desc"
                    className="text-sm mt-0.5"
                    style={{ color: "var(--hf-text-muted)" }}
                  >
                    {description}
                  </DialogPrimitive.Description>
                )}
              </div>
              {showClose && (
                <DialogPrimitive.Close
                  className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors opacity-60 hover:opacity-100 flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hf-lemon)]"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" style={{ color: "var(--hf-text)" }} />
                </DialogPrimitive.Close>
              )}
            </div>
          )}

          {/* Hidden a11y */}
          {!hasHeader && (
            <>
              <DialogPrimitive.Title className="sr-only">
                Dialog
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="sr-only">
                Content overlay
              </DialogPrimitive.Description>
            </>
          )}

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4">
            {loading ? <LoadingBody /> : error ? <ErrorBody error={error} /> : children}
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
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// ── Public API ────────────────────────────────────────────────────────────────
/**
 * AdaptiveOverlay — unified modal / bottom-sheet.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {(open: boolean) => void} props.onOpenChange
 * @param {React.ReactNode} [props.title]
 * @param {React.ReactNode} [props.description]
 * @param {React.ReactNode} props.children
 * @param {React.ReactNode} [props.footer]       Sticky footer rendered below body
 * @param {'sm'|'md'|'lg'|'xl'|'full'} [props.size='md']
 * @param {boolean} [props.loading=false]        Shows spinner in body
 * @param {string|null} [props.error=null]       Shows error state in body
 * @param {() => void} [props.onBack]            Shows back button in header
 * @param {boolean} [props.showClose]            Override close button visibility
 * @param {boolean} [props.dismissible=true]     Allow swipe/click-outside dismiss
 * @param {string} [props.className]             Desktop content className
 * @param {string} [props.mobileClassName]       Mobile sheet className
 */
export function AdaptiveOverlay({ size = "md", showClose, ...props }) {
  const isMobile = useIsMobile();
  const cfg = SIZE_MAP[size] ?? SIZE_MAP.md;
  // Auto-determine close button: always show for lg+, or on explicit prop
  const resolvedShowClose =
    showClose !== undefined ? showClose : cfg.autoControls;

  if (isMobile) {
    return (
      <MobileOverlay
        size={size}
        showClose={resolvedShowClose}
        {...props}
      />
    );
  }
  return (
    <DesktopOverlay
      size={size}
      showClose={resolvedShowClose}
      {...props}
    />
  );
}

export default AdaptiveOverlay;
