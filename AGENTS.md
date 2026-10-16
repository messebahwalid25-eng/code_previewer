# Architecture
- Compile client-side framework previews with esbuild-wasm against a virtual uploaded filesystem; execute compiled code only in a sandboxed iframe, not the host app, to support standard module semantics without paid build servers.
- Expose only Vite-prefixed public environment values to previews; server credentials must never be injected into uploaded applications.
- Load compiler WASM client-side by the managed asset URL in public/wasm; never import a WASM binary into source bundles or commit oversized binaries, so published builds stay deployable.