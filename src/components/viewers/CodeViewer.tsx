"use client";

import { useEffect, useState } from "react";
import { PrismAsyncLight as SyntaxHighlighter } from "react-syntax-highlighter";
import python from "react-syntax-highlighter/dist/esm/languages/prism/python";
import {
  vscDarkPlus,
  vs,
} from "react-syntax-highlighter/dist/esm/styles/prism";

SyntaxHighlighter.registerLanguage("python", python);

type Props = {
  text: string;
  language: "python";
};

function readIsDark(): boolean {
  if (typeof document === "undefined") return true;
  return document.documentElement.classList.contains("dark");
}

function useIsDark(): boolean {
  const [isDark, setIsDark] = useState<boolean>(true);

  useEffect(() => {
    setIsDark(readIsDark());
    const observer = new MutationObserver(() => setIsDark(readIsDark()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  return isDark;
}

export function CodeViewer({ text, language }: Props) {
  const isDark = useIsDark();
  const style = isDark ? vscDarkPlus : vs;

  return (
    <div className="rounded-lg border border-ink-800 overflow-hidden">
      <SyntaxHighlighter
        language={language}
        style={style}
        showLineNumbers
        wrapLongLines={false}
        customStyle={{
          margin: 0,
          padding: "0.9rem 1rem",
          background: isDark ? "#1e1e1e" : "#ffffff",
          fontSize: "0.78rem",
          lineHeight: 1.55,
        }}
        lineNumberStyle={{
          color: isDark ? "#858585" : "#237893",
          minWidth: "2.25em",
          paddingRight: "1em",
          userSelect: "none",
        }}
        codeTagProps={{
          style: {
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          },
        }}
      >
        {text}
      </SyntaxHighlighter>
    </div>
  );
}
