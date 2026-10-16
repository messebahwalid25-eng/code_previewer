import * as esbuild from "esbuild-wasm";
import wasmURL from "esbuild-wasm/esbuild.wasm?url";
import { findEntry, normalizeFiles, normalizePath, publicEnvironment, readJson, resolveLocal, type PreviewFiles } from "./project";

let initialization: Promise<void> | undefined;
function initialize() {
  if (!initialization) initialization = esbuild.initialize({ wasmURL, worker: true }).catch(error => { initialization = undefined; throw error; });
  return initialization;
}

const safeScript = (text: string) => text.replace(/<\/script/gi, "<\\/script");

export async function compilePreview(input: PreviewFiles, assetURLs: Record<string, string> = {}) {
  await initialize();
  const files = normalizeFiles(input);
  const combined = normalizeFiles({ ...input, ...assetURLs });
  const assetValues = new Set(Object.values(assetURLs));
  const assets = Object.fromEntries(Object.entries(combined).filter(([, value]) => assetValues.has(value)));
  const entry = findEntry(files);
  if (!entry) throw new Error("Aucun point d’entrée React/Vite trouvé (src/main.tsx ou src/index.tsx).");
  const pkg = readJson(files["/package.json"]);
  if (pkg.dependencies?.next) throw new Error("Next.js nécessite un serveur. Cet aperçu gratuit exécute les projets React/Vite côté navigateur uniquement.");
  const dependencies = pkg.dependencies || {};
  const reactVersion = /^[~^]?(\d+\.\d+\.\d+)/.exec(dependencies.react || "")?.[1] || "18.3.1";
  const imports: Record<string, string> = {};
  const dependencyURL = (spec: string) => {
    const parts = spec.split("/");
    const name = spec.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
    const subpath = spec.slice(name.length);
    const version = name === "react" || name === "react-dom" ? reactVersion : /^[~^]?(\d+\.\d+\.\d+(?:-[\w.]+)?)/.exec(dependencies[name] || "")?.[1];
    return `https://esm.sh/${name}${version ? "@" + version : ""}${subpath}?bundle&external=react,react-dom`;
  };
  for (const spec of ["react", "react/jsx-runtime", "react/jsx-dev-runtime", "react-dom", "react-dom/client"]) imports[spec] = dependencyURL(spec);
  const styles: string[] = [];
  const plugin: esbuild.Plugin = {
    name: "uploaded-files",
    setup(build) {
      build.onResolve({ filter: /.*/ }, args => {
        if (args.kind === "entry-point") return { path: entry, namespace: "upload" };
        const path = resolveLocal(args.path, args.importer, { ...files, ...assets });
        if (path) return { path, namespace: "upload" };
        if (/^(https?:|data:)/.test(args.path)) return { path: args.path, external: true };
        if (/^(\.|\/|@\/|~\/)/.test(args.path)) return { errors: [{ text: `Fichier introuvable : ${args.path} (depuis ${args.importer})` }] };
        if (/^(node:|fs$|path$|child_process$|crypto$)/.test(args.path)) return { errors: [{ text: `Module serveur non disponible dans le navigateur : ${args.path}` }] };
        imports[args.path] = dependencyURL(args.path);
        return { path: args.path, external: true };
      });
      build.onLoad({ filter: /.*/, namespace: "upload" }, args => {
        const code = files[args.path];
        if (args.path in assets) return { contents: `export default ${JSON.stringify(assets[args.path])}`, loader: "js" };
        if (code === undefined) return { errors: [{ text: `Fichier non chargé : ${args.path}` }] };
        if (args.path.endsWith(".css")) {
          const css = code.replace(/@import\s+["']([^"']+)["'];?/g, (match, spec) => {
            const path = resolveLocal(spec, args.path, files);
            return path?.endsWith(".css") ? files[path] : match;
          }).replace(/url\(\s*["']?([^)'"\s]+)["']?\s*\)/g, (match, spec) => {
            const path = resolveLocal(spec, args.path, assets);
            return path ? `url(${JSON.stringify(assets[path])})` : match;
          });
          styles.push(css);
          return { contents: "export default {};", loader: "js" };
        }
        const extension = args.path.split(".").pop();
        const loader = extension === "json" ? "json" : extension === "ts" ? "ts" : extension === "tsx" ? "tsx" : "jsx";
        return { contents: code, loader, resolveDir: args.path.slice(0, args.path.lastIndexOf("/")) };
      });
    },
  };
  const env = publicEnvironment(files);
  const result = await esbuild.build({
    entryPoints: [entry], bundle: true, write: false, format: "esm", platform: "browser", target: "es2020",
    jsx: "automatic", plugins: [plugin], logLevel: "silent",
    define: { "import.meta.env": JSON.stringify(env), "process.env": JSON.stringify({ NODE_ENV: "development" }), "global": "globalThis" },
  });
  const tailwind4 = /^\D*4\./.test(dependencies.tailwindcss || pkg.devDependencies?.tailwindcss || "") || styles.some(css => /@import\s+["']tailwindcss["']/.test(css));
  let configScript = "";
  const configName = ["/tailwind.config.ts", "/tailwind.config.js", "/tailwind.config.cjs"].find(path => files[path]);
  if (configName && !tailwind4) {
    const transformed = await esbuild.transform(files[configName], { loader: configName.endsWith(".ts") ? "ts" : "js", format: "cjs" });
    // Execute uploaded configuration only inside the isolated iframe. Build-time plugins are omitted.
    configScript = `try { const module={exports:{}}; const require=(name)=>name==='tailwindcss/colors'?tailwind.colors:()=>({}); new Function('module','exports','require',${JSON.stringify(transformed.code)})(module,module.exports,require); const config=module.exports.default||module.exports; config.plugins=[]; tailwind.config=config; } catch(error) { console.warn('Tailwind configuration:',error); }`;
  }
  const style = styles.join("\n").replace(/@import\s+["']tailwindcss["'];?/g, "").replace(/@tailwind\s+(base|components|utilities);?/g, "");
  const sourceHtml = files["/index.html"] || "<html><head></head><body><div id='root'></div></body></html>";
  // Retain mount nodes, metadata, and user fonts; remove build entry scripts and styles already compiled.
  let html = sourceHtml.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi, "");
  const head = `<meta name="viewport" content="width=device-width, initial-scale=1.0"><script type="importmap">${safeScript(JSON.stringify({ imports }))}</script>${tailwind4 ? '<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>' : '<script src="https://cdn.tailwindcss.com"></script>'}<script>${safeScript(configScript)}</script><style type="text/tailwindcss">${style.replace(/<\/style/gi, "<\\/style")}</style><style>html,body{margin:0;min-height:100%}</style>`;
  const runtime = `<script>window.addEventListener('error',e=>report(e.error?.message||e.message));window.addEventListener('unhandledrejection',e=>report(e.reason?.message||String(e.reason)));function report(message){parent.postMessage({type:'react-preview-error',message},'*');}</script><script type="module">${safeScript(result.outputFiles?.[0]?.text || "")}</script>`;
  html = /<\/head>/i.test(html) ? html.replace(/<\/head>/i, head + "</head>") : head + html;
  return /<\/body>/i.test(html) ? html.replace(/<\/body>/i, runtime + "</body>") : html + runtime;
}