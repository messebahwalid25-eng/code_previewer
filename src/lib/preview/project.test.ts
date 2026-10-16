import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { findEntry, normalizeFiles, publicEnvironment, resolveLocal } from "./project";

describe("free browser preview resolution", () => {
  test("normalizes an uploaded Vite project and finds its TypeScript entry", () => {
    const files = normalizeFiles({ "example/package.json": "{}", "example/index.html": '<script type="module" src="/src/main.tsx"></script>', "example/src/main.tsx": "export {}", "example/node_modules/no.js": "ignored" });
    assert.equal(findEntry(files), "/src/main.tsx");
    assert.equal(files["/node_modules/no.js"], undefined);
  });
  test("resolves @/* imports without configuration", () => {
    assert.equal(resolveLocal("@/components/Button", "/src/App.tsx", { "/src/components/Button.tsx": "" }), "/src/components/Button.tsx");
  });
  test("resolves configured TypeScript aliases", () => {
    const files = { "/tsconfig.json": JSON.stringify({ compilerOptions: { baseUrl: ".", paths: { "@/*": ["client/*"] } } }), "/client/store/index.ts": "" };
    assert.equal(resolveLocal("@/store", "/src/App.tsx", files), "/client/store/index.ts");
  });
  test("exposes VITE environment values but never private credentials", () => {
    assert.deepEqual(publicEnvironment({ "/.env": "VITE_TITLE=Preview\nSECRET_KEY=hidden\n", "/.env.development": 'VITE_TITLE="Development"' }), { MODE: "development", DEV: true, PROD: false, SSR: false, BASE_URL: "/", VITE_TITLE: "Development" });
  });
});