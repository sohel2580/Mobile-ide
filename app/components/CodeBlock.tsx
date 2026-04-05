import { useState } from "react";
import { Copy, Check, Download } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

export const CodeBlock = ({ language, value }: { language: string; value: string }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadCode = () => {
    const blob = new Blob([value], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `code-${Date.now()}.${language || "txt"}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative group my-4 rounded-xl overflow-hidden border border-gray-800 bg-[#1e1e1e] shadow-2xl">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800">
        <span className="text-xs font-mono text-gray-400 uppercase">{language || "code"}</span>
        <div className="flex items-center gap-3">
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
            title="Copy code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied!" : "Copy"}</span>
          </button>
          <button
            onClick={downloadCode}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
            title="Download code"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>
        </div>
      </div>
      <SyntaxHighlighter
        language={language || "text"}
        style={oneDark}
        customStyle={{
          margin: 0,
          padding: "1.25rem",
          fontSize: "0.875rem",
          backgroundColor: "transparent",
        }}
        codeTagProps={{
          style: {
            fontFamily: 'JetBrains Mono, Fira Code, monospace',
          }
        }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
};
