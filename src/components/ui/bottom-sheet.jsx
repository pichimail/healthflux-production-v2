import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

const BottomSheet = ({ open, onOpenChange, children }) => {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/60 z-50 md:hidden animate-fade-in"
        onClick={() => onOpenChange(false)}
      />
      <div className="fixed inset-x-0 bottom-0 z-50 md:hidden animate-slide-in-up">
        <div className="bg-[var(--hf-surface)] rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </>
  );
};

const BottomSheetHeader = ({ className, children, onClose }) => (
  <div className={cn("sticky top-0 bg-[var(--hf-surface)] border-b border-[var(--hf-border)] px-6 py-4 flex items-center justify-between rounded-t-3xl z-10", className)}>
    <div className="w-12 h-1.5 bg-[var(--hf-surface)]0 rounded-full absolute top-2 left-1/2 -translate-x-1/2" />
    <div className="flex-1 mt-2">{children}</div>
    {onClose && (
      <button onClick={onClose} className="ml-4 p-2 hover:bg-[var(--hf-surface-2)] rounded-full active-press">
        <X className="w-5 h-5 text-[var(--hf-muted)]" />
      </button>
    )}
  </div>
);

const BottomSheetTitle = ({ className, children }) => (
  <h2 className={cn("text-lg font-bold text-[var(--hf-text)]", className)}>
    {children}
  </h2>
);

const BottomSheetDescription = ({ className, children }) => (
  <p className={cn("text-sm text-[var(--hf-muted)] mt-1", className)}>
    {children}
  </p>
);

const BottomSheetContent = ({ className, children }) => (
  <div className={cn("px-6 py-4", className)}>
    {children}
  </div>
);

const BottomSheetFooter = ({ className, children }) => (
  <div className={cn("sticky bottom-0 bg-[var(--hf-surface)] border-t border-[var(--hf-border)] px-6 py-4 safe-area-inset-bottom", className)}>
    {children}
  </div>
);

export {
  BottomSheet,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetDescription,
  BottomSheetContent,
  BottomSheetFooter,
}