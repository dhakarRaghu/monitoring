"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="text-2xl font-bold text-foreground mt-8 mb-4 pb-2 border-b border-card-border">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-lg font-medium text-foreground mt-6 mb-2">
            {children}
          </h3>
        ),
        h4: ({ children }) => (
          <h4 className="text-base font-medium text-foreground mt-4 mb-2">
            {children}
          </h4>
        ),
        p: ({ children }) => (
          <p className="text-sm text-foreground-secondary leading-relaxed mb-4">
            {children}
          </p>
        ),
        ul: ({ children }) => (
          <ul className="list-disc list-inside text-sm text-foreground-secondary mb-4 space-y-1 ml-2">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside text-sm text-foreground-secondary mb-4 space-y-1 ml-2">
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li className="text-sm text-foreground-secondary leading-relaxed">
            {children}
          </li>
        ),
        code: ({ className, children }) => {
          const isBlock = className?.includes("language-");
          if (isBlock || (typeof children === "string" && children.includes("\n"))) {
            return (
              <code className="block bg-background-secondary border border-card-border rounded-lg p-4 text-xs font-mono text-foreground overflow-x-auto whitespace-pre mb-4">
                {children}
              </code>
            );
          }
          return (
            <code className="bg-primary-glow text-primary-light px-1.5 py-0.5 rounded text-xs font-mono">
              {children}
            </code>
          );
        },
        pre: ({ children }) => (
          <pre className="bg-background-secondary border border-card-border rounded-lg p-4 overflow-x-auto mb-4">
            {children}
          </pre>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-primary pl-4 my-4 text-foreground-secondary italic">
            {children}
          </blockquote>
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-xs border border-card-border rounded-lg overflow-hidden">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-card-elevated text-foreground-secondary">
            {children}
          </thead>
        ),
        th: ({ children }) => (
          <th className="px-3 py-2 text-left font-medium border-b border-card-border">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-3 py-2 border-b border-card-border text-foreground-secondary">
            {children}
          </td>
        ),
        hr: () => <hr className="border-card-border my-8" />,
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-light hover:underline"
          >
            {children}
          </a>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-foreground">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="italic text-foreground-secondary">{children}</em>
        ),
        input: ({ checked }) => (
          <input
            type="checkbox"
            checked={checked}
            readOnly
            className="mr-2 accent-primary"
          />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
