export type PreviewFiles = Record<string, string>;

const ignored = new Set(["node_modules", ".git", "dist", "build", ".next", "__MACOSX"]);
export function normalizePath(path: string) {
  const parts: string[] = [];
  for (const part of path.replace(/\\/g, "/").split("/")) {
    if (part === "..") parts.pop();
    else if (part && part !== ".") parts.push(part);
  }
  return "/" + parts.join("/");
}

export function normalizeFiles(input: PreviewFiles): PreviewFiles {
  const entries = Object.entries(input).filter(([path]) => !path.split("/").some(p => ignored.has(p)));
  const packagePath = entries.find(([path]) => /(^|\/)package\.json$/.test(path))?.[0];
  const root = packagePath ? packagePath.slice(0, -"package.json".length) : "";
  return Object.fromEntries(entries.map(([path, content]) => [normalizePath(root && path.startsWith(root) ? path.slice(root.length) : path), content]));
}

export function readJson(text?: string): Record<string, any> {
  try {
    // tsconfig commonly contains comments and trailing commas.
    return JSON.parse((text || "{}").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/,\s*([}\]])/g, "$1"));
  } catch { return {}; }
}

export function findEntry(files: PreviewFiles): string | undefined {
  const htmlEntry = files["/index.html"]?.match(/<script\b[^>]*src=["']([^"']+\.(?:tsx?|jsx?))["'][^>]*>/i)?.[1];
  if (htmlEntry && files[normalizePath(htmlEntry)]) return normalizePath(htmlEntry);
  return ["/src/main.tsx", "/src/main.jsx", "/src/index.tsx", "/src/index.jsx", "/src/main.ts", "/src/main.js", "/index.tsx", "/index.jsx", "/index.js"].find(p => p in files);
}

export function resolveLocal(spec: string, importer: string, files: PreviewFiles): string | undefined {
  let target = spec.split("?")[0];
  for (const configName of ["/tsconfig.app.json", "/tsconfig.json", "/jsconfig.json"]) {
    const options = readJson(files[configName]).compilerOptions || {};
    for (const [key, values] of Object.entries(options.paths || {})) {
      const prefix = key.split("*")[0];
      const suffix = key.includes("*") ? key.split("*")[1] : "";
      if ((key.includes("*") && target.startsWith(prefix) && target.endsWith(suffix)) || target === key) {
        if (!Array.isArray(values)) continue;
        for (const value of values) {
          const rest = key.includes("*") ? target.slice(prefix.length, suffix ? -suffix.length : undefined) : "";
          const result = resolveCandidate(normalizePath(`${options.baseUrl || "."}/${value.replace("*", rest)}`), files);
          if (result) return result;
        }
      }
    }
  }
  if (target.startsWith("@/")) target = "/src/" + target.slice(2);
  else if (target.startsWith("~/")) target = "/src/" + target.slice(2);
  else if (target.startsWith(".")) target = importer.slice(0, importer.lastIndexOf("/") + 1) + target;
  else if (!target.startsWith("/")) return undefined;
  return resolveCandidate(normalizePath(target), files);
}

function resolveCandidate(path: string, files: PreviewFiles) {
  return ["", ".tsx", ".ts", ".jsx", ".js", ".mjs", ".cjs", ".json", ".css", "/index.tsx", "/index.ts", "/index.jsx", "/index.js"].map(ext => path + ext).find(p => p in files);
}

export function publicEnvironment(files: PreviewFiles) {
  const values: Record<string, string | boolean> = { MODE: "development", DEV: true, PROD: false, SSR: false, BASE_URL: "/" };
  for (const filename of ["/.env", "/.env.local", "/.env.development", "/.env.development.local"]) {
    for (const line of (files[filename] || "").split(/\r?\n/)) {
      const match = line.match(/^\s*(?:export\s+)?(VITE_[\w]+)\s*=\s*(.*)$/);
      if (!match) continue;
      let value = match[2].trim();
      if (/^["']/.test(value)) value = value.slice(1, value.lastIndexOf(value[0]));
      else value = value.replace(/\s+#.*$/, "").trim();
      values[match[1]] = value;
    }
  }
  return values;
}