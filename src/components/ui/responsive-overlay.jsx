// ─────────────────────────────────────────────────────────────────────────────
// ResponsiveOverlay — backward-compat wrapper over AdaptiveOverlay.
// All new code should import AdaptiveOverlay directly.
// ─────────────────────────────────────────────────────────────────────────────
import React from "react";
import { AdaptiveOverlay } from "@/components/ui/adaptive-overlay";
import { cn } from "@/lib/utils";

/**
 * ResponsiveOverlay — backward-compat shim.
 * Delegates to AdaptiveOverlay. New code should use AdaptiveOverlay directly.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {(open: boolean) => void} props.onOpenChange
 * @param {React.ReactNode} [props.title]
 * @param {React.ReactNode} [props.description]
 * @param {React.ReactNode} props.children
 * @param {string} [props.desktopClassName]
 * @param {string} [props.mobileClassName]
 * @param {boolean} [props.hideHeader=false]
 */
export default function ResponsiveOverlay({
  open,
  onOpenChange,
  title,
  description,
  children,
  desktopClassName = "",
  mobileClassName = "",
  hideHeader = false,
}) {
  return (
    <AdaptiveOverlay
      open={open}
      onOpenChange={onOpenChange}
      title={hideHeader ? undefined : title}
      description={hideHeader ? undefined : description}
      size="md"
      className={cn(desktopClassName)}
      mobileClassName={cn(mobileClassName)}
    >
      {children}
    </AdaptiveOverlay>
  );
}
