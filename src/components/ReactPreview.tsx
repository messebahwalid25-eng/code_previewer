import { useMemo } from "react";
import { Sandpack } from "@codesandbox/sandpack-react";
import { ExtractedFile } from "@/services/extractionService";

interface ReactPreviewProps {
  files: ExtractedFile[];
  fileContents: Record<string, string>;
  className?: string;
}

const ReactPreview = ({ files, fileContents, className = "" }: ReactPreviewProps) => {
  // Build Sandpack files object from extracted files
  const sandpackFiles = useMemo(() => {
    const result: Record<string, string> = {};
    
    // Map files to Sandpack format
    files.forEach(file => {
      const content = fileContents[file.storage_path];
      if (content) {
        // Normalize path for Sandpack (must start with /)
        let path = file.file_path;
        if (!path.startsWith("/")) {
          path = "/" + path;
        }
        result[path] = content;
      }
    });

    // Ensure we have essential files
    if (!result["/index.html"]) {
      result["/index.html"] = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>React App</title>
</head>
<body>
  <div id="root"></div>
</body>
</html>`;
    }

    // Find main entry point
    const hasAppTsx = result["/src/App.tsx"] || result["/App.tsx"];
    const hasAppJsx = result["/src/App.jsx"] || result["/App.jsx"];
    const hasAppJs = result["/src/App.js"] || result["/App.js"];
    
    // Create index file if missing
    if (!result["/index.js"] && !result["/index.tsx"] && !result["/src/index.js"] && !result["/src/index.tsx"] && !result["/src/main.tsx"] && !result["/src/main.jsx"]) {
      const appImport = hasAppTsx ? "./App" : hasAppJsx ? "./App" : hasAppJs ? "./App" : "./App";
      result["/index.js"] = `import React from "react";
import ReactDOM from "react-dom/client";
import App from "${appImport}";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`;
    }

    return result;
  }, [files, fileContents]);

  // Determine entry file
  const entryFile = useMemo(() => {
    const possibleEntries = [
      "/src/main.tsx",
      "/src/main.jsx",
      "/src/index.tsx",
      "/src/index.jsx",
      "/src/index.js",
      "/index.tsx",
      "/index.jsx",
      "/index.js",
    ];
    
    for (const entry of possibleEntries) {
      if (sandpackFiles[entry]) {
        return entry;
      }
    }
    return "/index.js";
  }, [sandpackFiles]);

  // Check if it's TypeScript project
  const isTypeScript = useMemo(() => {
    return files.some(f => f.file_name.endsWith(".tsx") || f.file_name.endsWith(".ts"));
  }, [files]);

  if (Object.keys(sandpackFiles).length === 0) {
    return (
      <div className={`flex items-center justify-center h-full text-muted-foreground ${className}`}>
        Chargement des fichiers...
      </div>
    );
  }

  return (
    <div className={`h-full w-full [&_.sp-wrapper]:h-full [&_.sp-layout]:h-full [&_.sp-preview]:h-full [&_.sp-preview-container]:h-full ${className}`}>
      <Sandpack
        template={isTypeScript ? "react-ts" : "react"}
        files={sandpackFiles}
        options={{
          showNavigator: false,
          showTabs: false,
          showLineNumbers: false,
          editorHeight: "100%",
          activeFile: entryFile,
        }}
        customSetup={{
          entry: entryFile,
        }}
        theme="dark"
      />
    </div>
  );
};

export default ReactPreview;
