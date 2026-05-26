"use client";
// ─────────────────────────────────────────────────────────────────────────────
// AdaptiveToast — HF-branded Sonner toaster + typed toast helpers
//
// Mount <AdaptiveToaster /> once in the app (App.jsx).
// Then use typed helpers anywhere:
//
//   import { toastSuccess, toastError, toastInfo, toastWarning } from
//     '@/components/ui/adaptive-toast';
//
//   toastSuccess("Medication saved!");
//   toastError("Upload failed", { description: "Check your connection" });
//   toastLoading("Processing…", { id: "upload" });
//   toastDismiss("upload");
//
// Or re-use the raw sonner API:
//   import { toast } from 'sonner';
// ─────────────────────────────────────────────────────────────────────────────

import * as React from "react";
import { Toaster } from "sonner";
import { toast as sonnerToast } from "sonner";
import { CheckCircle, XCircle, AlertTriangle, Info, Loader2 } from "lucide-react";

// ── Icon components for typed toasts ─────────────────────────────────────────
function SuccessIcon() {
  return (
    <CheckCircle
      className="h-4 w-4 flex-shrink-0"
      style={{ color: "var(--hf-mint-strong)" }}
    />
  );
}

function ErrorIcon() {
  return (
    <XCircle
      className="h-4 w-4 flex-shrink-0"
      style={{ color: "var(--hf-coral-strong)" }}
    />
  );
}

function WarningIcon() {
  return (
    <AlertTriangle
      className="h-4 w-4 flex-shrink-0"
      style={{ color: "var(--hf-peach-strong)" }}
    />
  );
}

function InfoIcon() {
  return (
    <Info
      className="h-4 w-4 flex-shrink-0"
      style={{ color: "var(--hf-sky-strong)" }}
    />
  );
}

function LoadingIcon() {
  return (
    <Loader2
      className="h-4 w-4 flex-shrink-0 animate-spin"
      style={{ color: "var(--hf-lemon)" }}
    />
  );
}

// ── HF-branded Toaster component ─────────────────────────────────────────────
/**
 * AdaptiveToaster — mount once in App.jsx, replaces both Toaster and Sonner.
 */
export function AdaptiveToaster() {
  return (
    <Toaster
      position="bottom-right"
      expand={false}
      richColors={false}
      closeButton={false}
      duration={4000}
      gap={8}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: [
            "flex items-start gap-3 w-full px-4 py-3 rounded-2xl",
            "text-sm font-medium",
            "shadow-2xl",
            "border",
            "max-w-[360px]",
          ].join(" "),
          title: "text-sm font-semibold leading-tight",
          description: "text-xs mt-0.5 leading-snug opacity-80",
          closeButton: [
            "absolute right-3 top-3 w-5 h-5 flex items-center justify-center",
            "rounded-md opacity-50 hover:opacity-100 transition-opacity",
          ].join(" "),
        },
        style: {
          background: "var(--hf-panel-strong)",
          border: "1px solid var(--hf-border)",
          color: "var(--hf-text)",
          backdropFilter: "blur(30px) saturate(150%)",
          WebkitBackdropFilter: "blur(30px) saturate(150%)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        },
      }}
    />
  );
}

// ── Typed toast helpers ───────────────────────────────────────────────────────
/**
 * @param {string} message
 * @param {{ description?: string; duration?: number; id?: string }} [opts]
 */
export function toastSuccess(message, opts = {}) {
  return sonnerToast(message, {
    icon: <SuccessIcon />,
    ...opts,
  });
}

/**
 * @param {string} message
 * @param {{ description?: string; duration?: number; id?: string }} [opts]
 */
export function toastError(message, opts = {}) {
  return sonnerToast(message, {
    icon: <ErrorIcon />,
    duration: opts.duration ?? 6000,
    ...opts,
  });
}

/**
 * @param {string} message
 * @param {{ description?: string; duration?: number; id?: string }} [opts]
 */
export function toastWarning(message, opts = {}) {
  return sonnerToast(message, {
    icon: <WarningIcon />,
    ...opts,
  });
}

/**
 * @param {string} message
 * @param {{ description?: string; duration?: number; id?: string }} [opts]
 */
export function toastInfo(message, opts = {}) {
  return sonnerToast(message, {
    icon: <InfoIcon />,
    ...opts,
  });
}

/**
 * @param {string} message
 * @param {{ description?: string; id?: string }} [opts]
 * @returns {string|number} toast id — pass to toastDismiss() when done
 */
export function toastLoading(message, opts = {}) {
  return sonnerToast(message, {
    icon: <LoadingIcon />,
    duration: Infinity,
    ...opts,
  });
}

/**
 * Dismiss a specific toast by id, or all toasts if no id given.
 * @param {string|number} [id]
 */
export function toastDismiss(id) {
  sonnerToast.dismiss(id);
}

// Re-export raw sonner toast for backward compat
export { sonnerToast as toast };
