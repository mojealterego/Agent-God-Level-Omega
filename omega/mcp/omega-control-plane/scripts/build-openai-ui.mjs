import { build } from 'esbuild';
import { writeFile } from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const result=await build({entryPoints:[new URL('src/openai/ui-app.js',root).pathname],bundle:true,write:false,format:'iife',platform:'browser',target:['es2022'],minify:true});
const js=result.outputFiles.find(f=>f.path.endsWith('.js'))?.text;
if(!js) throw new Error('UI bundle missing');
const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>OMEGA Control Center</title><style>body{font-family:system-ui,sans-serif;margin:0;padding:18px;color:CanvasText;background:Canvas}main{max-width:980px;margin:auto}.bar{display:flex;gap:8px;flex-wrap:wrap}.card{border:1px solid color-mix(in srgb,CanvasText 18%,transparent);border-radius:12px;padding:14px;margin:12px 0}button,textarea{font:inherit}textarea{width:100%;min-height:320px;box-sizing:border-box}pre{white-space:pre-wrap}</style></head><body><main><h1>OMEGA Control Center</h1><div class="bar"><button id="sync">Sync model context</button><button id="reload">Reload file</button><button id="save">Save file</button></div><section class="card"><div id="route"></div><textarea id="editor" aria-label="OMEGA file editor"></textarea></section><pre id="status"></pre></main><script>${js}</script></body></html>`;
await writeFile(new URL('src/openai/generated-control-center.mjs',root),`export const OMEGA_CONTROL_CENTER_HTML=${JSON.stringify(html)};\n`);
console.log(`OMEGA UI bundle: ${Buffer.byteLength(html)} bytes`);
