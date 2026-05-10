import React, { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { useBottomSheet } from "@/lib/BottomSheetContext";
import { cn } from "@/lib/utils";

/**
 * @typedef {object} ResponsiveOverlayProps
 * @property {boolean} open
 * @property {(open: boolean) => void} onOpenChange
 * @property {React.ReactNode} [title]
 * @property {React.ReactNode} [description]
 * @property {React.ReactNode} children
 * @property {string} [desktopClassName]
 * @property {string} [mobileClassName]
 * @property {boolean} [hideHeader]
 */

/**
 * @param {ResponsiveOverlayProps} props
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
  const isMobile = useIsMobile();
  const { openSheet, closeSheet } = useBottomSheet();

  useEffect(() => {
    if (!isMobile || !open) {
      return undefined;
    }

    openSheet();
    return () => closeSheet();
  }, [closeSheet, isMobile, open, openSheet]);

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground>
        <DrawerContent
          className={cn(
            "max-h-[92dvh] rounded-t-[28px] bg-[var(--hf-surface)] text-[var(--hf-text)]",
            mobileClassName
          )}
        >
          {!hideHeader && (
            <DrawerHeader className="border-b border-[var(--hf-border)] px-5 pb-3 pt-2 text-left">
              {title ? <DrawerTitle>{title}</DrawerTitle> : null}
              {description ? (
                <DrawerDescription>{description}</DrawerDescription>
              ) : null}
            </DrawerHeader>
          )}
          <div className="overflow-y-auto px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] pt-4">
            {children}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-h-[92vh] overflow-hidden rounded-[28px] border-[var(--hf-border)] bg-[var(--hf-surface)] p-0 text-[var(--hf-text)]",
          desktopClassName
        )}
      >
        {!hideHeader && (
          <DialogHeader className="border-b border-[var(--hf-border)] px-6 pb-4 pt-6">
            {title ? <DialogTitle>{title}</DialogTitle> : null}
            {description ? (
              <DialogDescription>{description}</DialogDescription>
            ) : null}
          </DialogHeader>
        )}
        <div className="overflow-y-auto px-6 pb-6 pt-4">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
