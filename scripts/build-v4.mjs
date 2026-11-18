#!/usr/bin/env node
/**
 * Build the v4 browser bundles.
 *
 *   dist/v4/design-2026.<hash>.js  lazily loaded design chunk (content-hashed,
 *                                  safe under the CDN's one-year immutable cache)
 *   dist/v4/browser.js (+ .map)    main bundle, console kept
 *   dist/v4/browser-ultra.js       main bundle for the CDN (integration.js)
 *
 * The chunk is built first; its file name is baked into the main bundles.
 */
import { build } from "esbuild";
import { readdirSync, rmSync, mkdirSync } from "node:fs";
import { basename } from "node:path";

const OUT = "dist/v4";
mkdirSync(OUT, { recursive: true });
for (const f of readdirSync(OUT)) if (/^design-2026\..*\.js$/.test(f)) rmSync(`${OUT}/${f}`);

const common = { bundle: true, minify: true, target: "es2019", format: "iife", treeShaking: true, charset: "utf8", logLevel: "info" };

const chunk = await build({
  ...common,
  entryPoints: { "design-2026": "src/v4/design/entry.ts" },
  outdir: OUT,
  entryNames: "[name].[hash]",
  drop: ["console", "debugger"],
  legalComments: "none",
  metafile: true,
});
const chunkName = basename(Object.keys(chunk.metafile.outputs).find((p) => p.endsWith(".js")));
const define = { __MG_DESIGN_CHUNK__: JSON.stringify(chunkName) };

await build({ ...common, entryPoints: ["src/v4/browser.ts"], outfile: `${OUT}/browser.js`, sourcemap: "external", define });
await build({ ...common, entryPoints: ["src/v4/browser.ts"], outfile: `${OUT}/browser-ultra.js`, drop: ["console", "debugger"], legalComments: "none", define });

console.log(`design chunk: ${chunkName}`);
