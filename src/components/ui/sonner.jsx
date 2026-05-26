"use client";
// sonner.jsx — HF-branded Sonner toaster.
// For new code, prefer AdaptiveToaster from adaptive-toast.jsx.
import { Toaster as Sonner } from "sonner";

const Toaster = ({ ...props }) => (
  <Sonner
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
          "shadow-2xl border max-w-[360px]",
        ].join(" "),
        title: "text-sm font-semibold leading-tight",
        description: "text-xs mt-0.5 leading-snug opacity-80",
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
    {...props}
  />
);

export { Toaster };
