import { describe, expect, test } from "bun:test";
import { findEntry, normalizeFiles, publicEnvironment, resolveLocal } from "./project";

describe("free browser preview resolution", () => {
  test("normalizes an uploaded Vite project and finds its TypeScript entry", () => {
    const files = normalizeFiles({ "example/package.json": "{}", "example/index.html": '<script type="module" src="/src/main.tsx"></script>', "example/src/main.tsx": "export {}", "example/node_modules/no.js": "ignored" });
    expect(findEntry(files)).toBe("/src/main.tsx");
    expect(files["/node_modules/no.js"]).toBeUndefined();
  });
  test("resolves @/* imports without configuration", () => {
    expect(resolveLocal("@/components/Button", "/src/App.tsx", { "/src/components/Button.tsx": "" })).toBe("/src/components/Button.tsx");
  });
  test("resolves configured TypeScript aliases", () => {
    const files = { "/tsconfig.json": JSON.stringify({ compilerOptions: { baseUrl: ".", paths: { "@/*": ["client/*"] } } }), "/client/store/index.ts": "" };
    expect(resolveLocal("@/store", "/src/App.tsx", files)).toBe("/client/store/index.ts");
  });
  test("exposes VITE environment values but never private credentials", () => {
    expect(publicEnvironment({ "/.env": "VITE_TITLE=Preview\nSECRET_KEY=hidden\n", "/.env.development": 'VITE_TITLE="Development"' })).toEqual({ MODE: "development", DEV: true, PROD: false, SSR: false, BASE_URL: "/", VITE_TITLE: "Development" });
  });
});