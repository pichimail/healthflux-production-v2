const bulletLine = /^(\s*[-*+]\s+|\s*\d+\.\s+)/;
const headingLine = /^\s*#{1,6}\s+/;
const dividerLine = /^\s*([*_ -]){3,}\s*$/;

export function sanitizeMarkdown(input) {
  if (!input) {
    return "";
  }

  return String(input)
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, "  ")
    .replace(/^\s*•\s+/gm, "- ")
    .replace(/^\s*[·▪◦]\s+/gm, "- ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\s*[-*+]\s*$/gm, "")
    .replace(/^\s*#{1,6}\s*$/gm, "")
    .replace(/^\s*\*{3,}\s*$/gm, "")
    .replace(/^\s*_{3,}\s*$/gm, "")
    .trim();
}

export function markdownToPlainText(input) {
  return sanitizeMarkdown(input)
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")
    .replace(/_{1,3}([^_]+)_{1,3}/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\n{2,}/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function inferMarkdownMode(value) {
  const text = sanitizeMarkdown(value);
  if (!text) {
    return "empty";
  }

  const lines = text.split("\n").filter(Boolean);
  if (lines.some((line) => headingLine.test(line))) {
    return "structured";
  }
  if (lines.some((line) => bulletLine.test(line))) {
    return "list";
  }
  if (lines.some((line) => dividerLine.test(line))) {
    return "structured";
  }
  return "paragraph";
}
