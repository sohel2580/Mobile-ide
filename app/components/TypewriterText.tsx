import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { CodeBlock } from "./CodeBlock";

export const TypewriterText = ({ content, speed = 5 }: { content: string; speed?: number }) => {
  const [displayedText, setDisplayedText] = useState("");
  const indexRef = useRef(0);

  useEffect(() => {
    if (!content) return;
    
    setDisplayedText("");
    indexRef.current = 0;

    const timer = setInterval(() => {
      if (indexRef.current < content.length) {
        setDisplayedText((prev) => prev + content.charAt(indexRef.current));
        indexRef.current += 1;
      } else {
        clearInterval(timer);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [content, speed]);

  return (
    <ReactMarkdown
      components={{
        code({ node, inline, className, children, ...props }: any) {
          const match = /language-(\w+)/.exec(className || "");
          const language = match ? match[1] : "";
          const value = String(children).replace(/\n$/, "");

          return !inline ? (
            <CodeBlock language={language} value={value} />
          ) : (
            <code className="bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono text-yellow-400" {...props}>
              {children}
            </code>
          );
        },
        div: ({ children }) => <div className="mb-4 last:mb-0">{children}</div>,
        p: ({ children }) => <div className="mb-4 last:mb-0">{children}</div>,
        ul: ({ children }) => <ul className="list-disc ml-6 mb-4 space-y-2">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal ml-6 mb-4 space-y-2">{children}</ol>,
        h1: ({ children }) => <h1 className="text-2xl font-black mb-4 mt-8">{children}</h1>,
        h2: ({ children }) => <h2 className="text-xl font-bold mb-3 mt-6">{children}</h2>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-gray-600 pl-4 italic text-gray-400 my-4 bg-gray-800/50 py-2 rounded-r">
            {children}
          </blockquote>
        ),
      }}
    >
      {displayedText}
    </ReactMarkdown>
  );
};
