import { useEffect, useRef, useState } from "react";
import Prism from "prismjs";
import "prismjs/themes/prism-tomorrow.css";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-css";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-json";
import "prismjs/components/prism-dart";
import "prismjs/components/prism-yaml";
import "prismjs/components/prism-markdown";
import "prismjs/components/prism-python";
import "prismjs/components/prism-java";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";

interface CodeViewerProps {
  code: string;
  fileName: string;
  className?: string;
}

const getLanguage = (fileName: string): string => {
  const extension = fileName.split(".").pop()?.toLowerCase() || "";
  
  const languageMap: Record<string, string> = {
    js: "javascript",
    jsx: "jsx",
    ts: "typescript",
    tsx: "tsx",
    html: "markup",
    htm: "markup",
    xml: "markup",
    svg: "markup",
    css: "css",
    scss: "css",
    less: "css",
    json: "json",
    dart: "dart",
    yaml: "yaml",
    yml: "yaml",
    md: "markdown",
    py: "python",
    java: "java",
    c: "c",
    cpp: "cpp",
    h: "cpp",
    hpp: "cpp",
  };

  return languageMap[extension] || "plaintext";
};

const CodeViewer = ({ code, fileName, className = "" }: CodeViewerProps) => {
  const codeRef = useRef<HTMLElement>(null);
  const [highlightedCode, setHighlightedCode] = useState<string>("");

  useEffect(() => {
    const language = getLanguage(fileName);
    
    try {
      if (Prism.languages[language]) {
        const highlighted = Prism.highlight(code, Prism.languages[language], language);
        setHighlightedCode(highlighted);
      } else {
        setHighlightedCode(code);
      }
    } catch (error) {
      console.error("Error highlighting code:", error);
      setHighlightedCode(code);
    }
  }, [code, fileName]);

  return (
    <div className={`overflow-auto bg-[#1d1f21] rounded-lg ${className}`}>
      <pre className="p-4 text-sm leading-relaxed m-0">
        <code
          ref={codeRef}
          className={`language-${getLanguage(fileName)}`}
          dangerouslySetInnerHTML={{ __html: highlightedCode }}
        />
      </pre>
    </div>
  );
};

export default CodeViewer;
