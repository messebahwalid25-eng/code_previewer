import { useEffect, useMemo, useRef, useState } from "react";
import { ExtractedFile } from "@/services/extractionService";
import { Loader2 } from "lucide-react";

interface ReactPreviewProps {
  files: ExtractedFile[];
  fileContents: Record<string, string>;
  className?: string;
}

const IGNORED_PARTS = new Set(["node_modules", ".git", "dist", "build", ".next", "__MACOSX"]);

const getCommonRoot = (paths: string[]) => {
  const clean = paths.filter(p => !p.startsWith("__MACOSX/"));
  if (!clean.length) return "";
  const hasRoot = clean.some(p => !p.includes("/"));
  if (hasRoot) return "";
  const firsts = new Set(clean.map(p => p.split("/")[0]));
  return firsts.size === 1 ? Array.from(firsts)[0] + "/" : "";
};

const stripRoot = (p: string, root: string) => (root && p.startsWith(root) ? p.slice(root.length) : p);

const getDeps = (pkgJson: string | undefined): Record<string, string> => {
  const deps: Record<string, string> = {};
  if (!pkgJson) return deps;
  try {
    const parsed = JSON.parse(pkgJson);
    Object.assign(deps, parsed.dependencies || {});
  } catch {}
  return deps;
};

const ReactPreview = ({ files, fileContents, className = "" }: ReactPreviewProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [error, setError] = useState<string | null>(null);

  const { virtualFiles, entry, deps } = useMemo(() => {
    const root = getCommonRoot(files.map(f => f.file_path));
    const vfs: Record<string, string> = {};
    let pkg: string | undefined;

    for (const f of files) {
      const stripped = stripRoot(f.file_path, root);
      if (stripped.split("/").some(p => IGNORED_PARTS.has(p))) continue;
      const content = fileContents[f.storage_path];
      if (content == null) continue;
      vfs["/" + stripped] = content;
      if (stripped === "package.json") pkg = content;
    }

    const candidates = ["/src/main.tsx", "/src/main.jsx", "/src/index.tsx", "/src/index.jsx", "/src/main.ts", "/src/main.js", "/index.tsx", "/index.jsx", "/index.js"];
    const entryPath = candidates.find(c => vfs[c]) || Object.keys(vfs).find(k => /\/(main|index|app)\.(t|j)sx?$/i.test(k)) || "";

    return { virtualFiles: vfs, entry: entryPath, deps: getDeps(pkg) };
  }, [files, fileContents]);

  const previewSrc = useMemo(() => {
    if (!entry) return null;

    // Build importmap: bare deps -> esm.sh
    const importMap: Record<string, string> = {
      "react": "https://esm.sh/react@18.2.0",
      "react-dom": "https://esm.sh/react-dom@18.2.0",
      "react-dom/client": "https://esm.sh/react-dom@18.2.0/client",
      "react/jsx-runtime": "https://esm.sh/react@18.2.0/jsx-runtime",
    };
    Object.keys(deps).forEach(name => {
      if (name === "react" || name === "react-dom") return;
      if (/^(vite|@vitejs|typescript|tailwindcss|postcss|autoprefixer|eslint|@types\/|@swc\/|lovable-tagger)/.test(name)) return;
      importMap[name] = `https://esm.sh/${name}?external=react,react-dom`;
    });

    const filesJson = JSON.stringify(virtualFiles);
    const importMapJson = JSON.stringify({ imports: importMap });

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<style>html,body,#root{margin:0;padding:0;min-height:100%;height:100%;font-family:system-ui,-apple-system,sans-serif}</style>
<script type="importmap">${importMapJson}</script>
<script src="https://unpkg.com/@babel/standalone@7.24.7/babel.min.js"></script>
</head>
<body>
<div id="root"></div>
<div id="__error" style="display:none;position:fixed;inset:0;padding:20px;background:#1a1a1a;color:#ff6b6b;font-family:monospace;white-space:pre-wrap;overflow:auto;font-size:12px;z-index:9999"></div>
<script>
const VFS = ${filesJson};
const ENTRY = ${JSON.stringify(entry)};

function showError(msg){
  const el = document.getElementById('__error');
  el.style.display = 'block';
  el.textContent = String(msg && msg.stack || msg);
  console.error(msg);
}
window.addEventListener('error', e => showError(e.error || e.message));
window.addEventListener('unhandledrejection', e => showError(e.reason));

function resolvePath(from, spec){
  // bare module
  if (!spec.startsWith('.') && !spec.startsWith('/')) return null;
  const baseParts = from.split('/').slice(0, -1);
  const specParts = spec.split('/');
  for (const p of specParts){
    if (p === '..') baseParts.pop();
    else if (p !== '.' && p !== '') baseParts.push(p);
  }
  let candidate = '/' + baseParts.filter(Boolean).join('/');
  // try exact, then extensions, then index
  const exts = ['', '.tsx','.ts','.jsx','.js','.css','.json','/index.tsx','/index.ts','/index.jsx','/index.js'];
  for (const e of exts){
    if (VFS[candidate + e] != null) return candidate + e;
  }
  return null;
}

const moduleCache = {};

function transformCode(code, filename){
  const isCss = filename.endsWith('.css');
  if (isCss){
    const safe = code.replace(/\\\\/g,'\\\\\\\\').replace(/\`/g,'\\\\\`').replace(/\\$\\{/g, '\\\\\${');
    return \`const __css = \\\`\${safe}\\\`; const __style = document.createElement('style'); __style.textContent = __css; document.head.appendChild(__style); export default __css;\`;
  }
  if (filename.endsWith('.json')){
    return \`export default \${code};\`;
  }
  const presets = ['env'];
  if (/\\.(tsx|ts)$/.test(filename)) presets.push('typescript');
  if (/\\.(tsx|jsx)$/.test(filename) || /\\.tsx?$/.test(filename)) presets.push('react');
  try {
    const out = Babel.transform(code, {
      filename,
      presets: presets.map(p => p === 'typescript' ? ['typescript', { allExtensions: true, isTSX: filename.endsWith('.tsx') }] : p),
      plugins: [],
      sourceType: 'module',
    }).code;
    return out;
  } catch(e){
    showError('Compile error in ' + filename + ': ' + e.message);
    throw e;
  }
}

async function loadModule(path){
  if (moduleCache[path]) return moduleCache[path].exports;
  let code = VFS[path];
  if (code == null) throw new Error('Module not found: ' + path);
  const transformed = transformCode(code, path);

  // Replace relative imports with blob-resolved URLs by rewriting to dynamic loader pattern.
  // We'll wrap as module that uses our own require.
  const mod = { exports: {} };
  moduleCache[path] = mod;

  // Use Function-based execution with our require and a _import for ESM-like
  const requireFn = async (spec) => {
    const resolved = resolvePath(path, spec);
    if (resolved) return await loadModule(resolved);
    // bare: use native dynamic import (importmap will resolve)
    return await import(spec);
  };

  // Convert ESM transformed-by-babel-env (which becomes commonjs) into evaluable code
  // Babel preset-env with default targets emits CommonJS. We provide require/exports/module.
  const syncRequireMap = {};

  // Pre-resolve all require() calls statically by scanning code
  const reqRegex = /require\\((['"])([^'"]+)\\1\\)/g;
  const specs = new Set();
  let m;
  while ((m = reqRegex.exec(transformed))){ specs.add(m[2]); }

  const resolvedMods = {};
  for (const spec of specs){
    const resolved = resolvePath(path, spec);
    if (resolved){
      resolvedMods[spec] = await loadModule(resolved);
    } else {
      try { resolvedMods[spec] = await import(spec); } catch(e){ showError('Import failed: ' + spec + ' -> ' + e.message); throw e; }
    }
  }

  const localRequire = (spec) => {
    if (spec in resolvedMods) return resolvedMods[spec];
    throw new Error('Unresolved require: ' + spec);
  };

  try {
    const fn = new Function('require','module','exports', transformed);
    fn(localRequire, mod, mod.exports);
  } catch(e){
    showError('Runtime error in ' + path + ': ' + (e.stack||e.message));
    throw e;
  }
  return mod.exports;
}

(async () => {
  try {
    await loadModule(ENTRY);
  } catch(e){ showError(e); }
})();
</script>
</body>
</html>`;
  }, [virtualFiles, entry, deps]);

  useEffect(() => {
    setError(null);
    if (!entry) {
      setError("Aucun point d'entrée trouvé (src/main.tsx, src/index.tsx...)");
    }
  }, [entry]);

  if (Object.keys(virtualFiles).length === 0) {
    return (
      <div className={`flex items-center justify-center h-full text-muted-foreground ${className}`}>
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Chargement des fichiers...
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center h-full text-muted-foreground p-4 text-center ${className}`}>
        {error}
      </div>
    );
  }

  return (
    <div className={`h-full w-full bg-white ${className}`}>
      <iframe
        ref={iframeRef}
        srcDoc={previewSrc || ""}
        title="React Preview"
        className="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
      />
    </div>
  );
};

export default ReactPreview;
