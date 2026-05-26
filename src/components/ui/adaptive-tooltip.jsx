"use client";
// ─────────────────────────────────────────────────────────────────────────────
// AdaptiveTooltip — context-aware tooltip
//
// Desktop  → Radix Tooltip (appears on hover with proper delay/animation)
// Mobile   → Passes aria-label to the trigger (no visible tooltip on touch)
//
// Tooltips on touch screens cause accessibility confusion and UX issues:
// - No hover events on touch
// - Tap to show, tap elsewhere to hide — conflicts with tap-to-action
// - Instead: always supply meaningful button labels for screen readers
// ─────────────────────────────────────────────────────────────────────────────

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

// ── Desktop tooltip ───────────────────────────────────────────────────────────
function DesktopTooltip({
  content,
  children,
  side = "top",
  align = "center",
  delayDuration = 400,
  sideOffset = 6,
  className,
}) {
  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          {children}
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            align={align}
            sideOffset={sideOffset}
            className={cn(
              "z-[400] px-3 py-1.5 rounded-lg text-xs font-semibold",
              "pointer-events-none select-none",
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
              "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
              "data-[side=bottom]:slide-in-from-top-1",
              "data-[side=top]:slide-in-from-bottom-1",
              "data-[side=left]:slide-in-from-right-1",
              "data-[side=right]:slide-in-from-left-1",
              "duration-150",
              className,
            )}
            style={{
              background: "var(--hf-panel-strong)",
              border: "1px solid var(--hf-border)",
              color: "var(--hf-text)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
              backdropFilter: "blur(20px) saturate(140%)",
              WebkitBackdropFilter: "blur(20px) saturate(140%)",
            }}
            avoidCollisions
            collisionPadding={8}
          >
            {content}
            {/* Arrow */}
            <TooltipPrimitive.Arrow
              className="fill-current"
              style={{ color: "var(--hf-border)" }}
              width={8}
              height={4}
            />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

// ── Mobile: aria-label passthrough ───────────────────────────────────────────
function MobileTooltip({ content, children }) {
  // Inject aria-label from tooltip content string onto the trigger
  if (!React.isValidElement(children)) return children;
  const ariaLabel =
    typeof content === "string" ? content : undefined;
  if (!ariaLabel) return children;
  return React.cloneElement(children, {
    "aria-label": children.props["aria-label"] ?? ariaLabel,
  });
}

// ── Public API ────────────────────────────────────────────────────────────────
/**
 * AdaptiveTooltip — hover tooltip on desktop, aria-label on mobile.
 *
 * @param {object} props
 * @param {React.ReactNode} props.content             Tooltip content (string preferred)
 * @param {React.ReactElement} props.children         Trigger element (must accept ref)
 * @param {'top'|'bottom'|'left'|'right'} [props.side='top']
 * @param {'start'|'center'|'end'} [props.align='center']
 * @param {number} [props.delayDuration=400]          Hover delay in ms (desktop)
 * @param {number} [props.sideOffset=6]               Distance from trigger
 * @param {string} [props.className]                  Tooltip content className
 */
export function AdaptiveTooltip(props) {
  const isMobile = useIsMobile();
  if (isMobile) return <MobileTooltip {...props} />;
  return <DesktopTooltip {...props} />;
}

export default AdaptiveTooltip;
