/**
 * Author: Domonick Mack
 * Date: 2026-11-15
 * Description: Safe React Markdown renderer supporting headings, code blocks, inline formatting, and lists without XSS vulnerabilities.
 */

"use client";

import React from "react";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Renders inline formatting (**bold**, *italic*, `code`) safely as React nodes.
 */
function renderInlineTokens(text: string): React.ReactNode[] {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code
          key={idx}
          className="rounded bg-slate-200/80 px-1.5 py-0.5 font-mono text-xs text-indigo-700 dark:bg-slate-800 dark:text-indigo-300"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong
          key={idx}
          className="font-semibold text-slate-900 dark:text-white"
        >
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return (
        <em key={idx} className="italic">
          {part.slice(1, -1)}
        </em>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

export function MarkdownRenderer({
  content,
  className = "",
}: MarkdownRendererProps) {
  const blocks: React.ReactNode[] = [];
  const lines = content.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";

    // Fenced code block
    if (line.trim().startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !(lines[i] ?? "").trim().startsWith("```")) {
        codeLines.push(lines[i] ?? "");
        i++;
      }
      i++; // Skip closing ```
      blocks.push(
        <pre
          key={`code-${i}`}
          className="my-2 overflow-x-auto rounded-lg border border-slate-200 bg-slate-900 p-3 font-mono text-xs leading-relaxed text-slate-100 dark:border-slate-800 dark:bg-slate-950"
        >
          <code>{codeLines.join("\n")}</code>
        </pre>
      );
      continue;
    }

    // Headings
    if (line.startsWith("### ")) {
      blocks.push(
        <h4
          key={`h3-${i}`}
          className="mt-3 mb-1 text-xs font-bold tracking-wider text-slate-700 uppercase dark:text-slate-300"
        >
          {renderInlineTokens(line.slice(4))}
        </h4>
      );
      i++;
      continue;
    }

    if (line.startsWith("## ")) {
      blocks.push(
        <h3
          key={`h2-${i}`}
          className="mt-3 mb-1.5 text-sm font-semibold text-slate-900 dark:text-white"
        >
          {renderInlineTokens(line.slice(3))}
        </h3>
      );
      i++;
      continue;
    }

    // Unordered list items
    if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
      const listItems: string[] = [];
      while (
        i < lines.length &&
        ((lines[i] ?? "").trim().startsWith("- ") ||
          (lines[i] ?? "").trim().startsWith("* "))
      ) {
        listItems.push((lines[i] ?? "").trim().slice(2));
        i++;
      }
      blocks.push(
        <ul
          key={`ul-${i}`}
          className="my-1.5 list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-300"
        >
          {listItems.map((item, idx) => (
            <li key={idx}>{renderInlineTokens(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // Blank line
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Standard paragraph
    blocks.push(
      <p
        key={`p-${i}`}
        className="my-1.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300"
      >
        {renderInlineTokens(line)}
      </p>
    );
    i++;
  }

  return <div className={`space-y-1 ${className}`}>{blocks}</div>;
}
