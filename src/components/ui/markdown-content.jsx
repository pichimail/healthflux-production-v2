import React from "react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { markdownToPlainText, sanitizeMarkdown } from "@/lib/markdown";

const components = {
  h1: ({ children }) => (
    <h2 className="mt-4 mb-2 text-base font-black tracking-tight text-[var(--hf-text)] first:mt-0">
      {children}
    </h2>
  ),
  h2: ({ children }) => (
    <h3 className="mt-4 mb-2 text-sm font-black tracking-tight text-[var(--hf-text)] first:mt-0">
      {children}
    </h3>
  ),
  h3: ({ children }) => (
    <h4 className="mt-3 mb-1.5 text-sm font-bold text-[var(--hf-text)] first:mt-0">
      {children}
    </h4>
  ),
  p: ({ children }) => (
    <p className="mb-2 text-sm leading-6 text-[var(--hf-text)] last:mb-0">{children}</p>
  ),
  ul: ({ children }) => <ul className="mb-2 space-y-1.5">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 space-y-1.5">{children}</ol>,
  li: ({ children }) => (
    <li className="flex gap-2 text-sm text-[var(--hf-text)]">
      <span
        aria-hidden="true"
        className="mt-2 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--hf-lemon)]"
      />
      <span className="flex-1">{children}</span>
    </li>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-2 border-[var(--hf-border-strong)] pl-3 text-sm italic text-[var(--hf-text-muted)]">
      {children}
    </blockquote>
  ),
  strong: ({ children }) => (
    <strong className="font-bold text-[var(--hf-text)]">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-[var(--hf-text-muted)]">{children}</em>
  ),
  code: ({ children }) => (
    <code className="rounded-md bg-[var(--hf-surface-2)] px-1.5 py-0.5 text-xs text-[var(--hf-text)]">
      {children}
    </code>
  ),
  hr: () => <div className="my-3 h-px bg-[var(--hf-border)]" />,
};

export function MarkdownContent({ content, className }) {
  const sanitized = sanitizeMarkdown(content);
  if (!sanitized) {
    return null;
  }

  return (
    <div className={cn("text-sm", className)}>
      <ReactMarkdown components={components}>{sanitized}</ReactMarkdown>
    </div>
  );
}

export function MarkdownPreview({ content, maxLength = 180, className }) {
  const plain = markdownToPlainText(content);
  if (!plain) {
    return null;
  }

  const preview =
    plain.length > maxLength ? `${plain.slice(0, maxLength).trimEnd()}…` : plain;

  return (
    <p className={cn("text-sm leading-6 text-[var(--hf-text-muted)]", className)}>
      {preview}
    </p>
  );
}

export default MarkdownContent;
