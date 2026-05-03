import { useMemo } from "react";
import { Sandpack } from "@codesandbox/sandpack-react";
import { ExtractedFile } from "@/services/extractionService";

interface ReactPreviewProps {
  files: ExtractedFile[];
  fileContents: Record<string, string>;
  className?: string;
}

const SANDBOX_EXTENSIONS = new Set(["js", "jsx", "ts", "tsx", "css", "scss", "sass", "html", "json", "svg"]);
const IGNORED_PATH_PARTS = new Set(["node_modules", ".git", "dist", "build", ".next", "coverage", "__MACOSX"]);
const IGNORED_FILES = new Set([
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "bun.lockb",
  "postcss.config.js",
  "postcss.config.cjs",
  "postcss.config.mjs",
  "tailwind.config.js",
  "tailwind.config.ts",
  "vite.config.js",
  "vite.config.ts",
]);

const COMMON_DEPENDENCIES: Record<string, string> = {
  "@vitejs/plugin-react": "latest",
  "class-variance-authority": "latest",
  clsx: "latest",
  "date-fns": "latest",
  "embla-carousel-react": "latest",
  "framer-motion": "latest",
  "lucide-react": "latest",
  "react-router-dom": "latest",
  recharts: "latest",
  sonner: "latest",
  "tailwind-merge": "latest",
  uuid: "latest",
  zod: "latest",
};

const getCommonRoot = (paths: string[]) => {
  const cleanPaths = paths.filter(path => path.includes("/") && !path.startsWith("__MACOSX/"));
  if (cleanPaths.length === 0) return null;

  const firstSegments = new Set(cleanPaths.map(path => path.split("/")[0]));
  const hasRootFile = paths.some(path => !path.includes("/"));

  return !hasRootFile && firstSegments.size === 1 ? Array.from(firstSegments)[0] : null;
};

const normalizeSandpackPath = (filePath: string, commonRoot: string | null) => {
  const withoutRoot = commonRoot && filePath.startsWith(`${commonRoot}/`)
    ? filePath.slice(commonRoot.length + 1)
    : filePath;

  return withoutRoot.startsWith("/") ? withoutRoot : `/${withoutRoot}`;
};

const shouldIncludeFile = (path: string) => {
  const normalized = path.replace(/^\//, "");
  const fileName = normalized.split("/").pop() || "";
  const extension = fileName.split(".").pop()?.toLowerCase() || "";

  if (normalized.split("/").some(part => IGNORED_PATH_PARTS.has(part))) return false;
  if (IGNORED_FILES.has(fileName)) return false;
  if (fileName === "package.json") return false;

  return SANDBOX_EXTENSIONS.has(extension);
};

const getDependenciesFromPackageJson = (files: ExtractedFile[], fileContents: Record<string, string>, commonRoot: string | null) => {
  const packageFile = files.find(file => normalizeSandpackPath(file.file_path, commonRoot) === "/package.json");
  const content = packageFile ? fileContents[packageFile.storage_path] : null;
  const dependencies: Record<string, string> = {
    react: "18.2.0",
    "react-dom": "18.2.0",
  };

  if (!content) return dependencies;

  try {
    const parsed = JSON.parse(content);
    const projectDeps = { ...(parsed.dependencies || {}), ...(parsed.devDependencies || {}) };

    Object.keys(projectDeps).forEach((name) => {
      if (name === "react" || name === "react-dom") return;
      if (name.startsWith("@types/") || name === "vite" || name === "typescript") return;
      dependencies[name] = COMMON_DEPENDENCIES[name] || "latest";
    });
  } catch (error) {
    console.warn("Invalid package.json ignored for preview", error);
  }

  return dependencies;
};

const ReactPreview = ({ files, fileContents, className = "" }: ReactPreviewProps) => {
  const commonRoot = useMemo(() => getCommonRoot(files.map(file => file.file_path)), [files]);

  // Build Sandpack files object from extracted files
  const sandpackFiles = useMemo(() => {
    const result: Record<string, string> = {};
    
    // Map files to Sandpack format
    files.forEach(file => {
      const content = fileContents[file.storage_path];
      const path = normalizeSandpackPath(file.file_path, commonRoot);

      if (content && shouldIncludeFile(path)) {
        // Normalize path for Sandpack (must start with /)
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
  }, [files, fileContents, commonRoot]);

  const dependencies = useMemo(
    () => getDependenciesFromPackageJson(files, fileContents, commonRoot),
    [files, fileContents, commonRoot]
  );

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
          dependencies,
        }}
        theme="dark"
      />
    </div>
  );
};

export default ReactPreview;
