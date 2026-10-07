export const OMEGA_UI_URI = 'ui://omega/control-center';

export function buildOmegaUiMetadata() {
  return {
    ui: { resourceUri: OMEGA_UI_URI, visibility: ['app', 'model'] },
    'openai/ui': {
      entrypoints: [
        { type: 'global' },
        { type: 'thread' },
        { type: 'settings', searchTerms: ['omega', 'automation', 'visual', 'wda', 'events'] },
        { type: 'file', extensions: ['.md', '.txt', '.json', '.yaml', '.yml'] }
      ]
    }
  };
}

export function buildOmegaResourceMetadata() {
  return {
    'openai/ui': {
      preferredDisplayMode: 'fullscreen',
      availableDisplayModes: ['fullscreen', 'inline']
    }
  };
}

export function buildOmegaForm(options = []) {
  const choices = options.slice(0, 24).map(item => ({
    const: String(item.id),
    title: String(item.title ?? item.id),
    ...(item.description ? { description: String(item.description) } : {}),
    ...(item.thumbnail ? { 'x-openai-thumbnail': String(item.thumbnail) } : {})
  }));
  return {
    type: 'object',
    properties: {
      mode: { type: 'string', title: 'OMEGA mode', oneOf: choices },
      approvals: {
        type: 'array', title: 'Approval gates', items: { type: 'string' },
        'x-openai-suggestions': [
          { const: 'external-write', title: 'External writes' },
          { const: 'credit-spend', title: 'Provider credit spend' },
          { const: 'release', title: 'Release/publish' }
        ]
      }
    },
    required: ['mode']
  };
}

export function buildMentionItems(items = [], query = '') {
  const needle = String(query).trim().toLowerCase();
  return items
    .filter(item => !needle || `${item.name ?? ''} ${item.description ?? ''} ${item.uri ?? ''}`.toLowerCase().includes(needle))
    .slice(0, 20)
    .map(item => ({
      type: 'resource_link',
      uri: String(item.uri),
      name: String(item.name ?? item.uri),
      ...(item.description ? { description: String(item.description) } : {})
    }));
}

export function buildOmegaAppHtml() {
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>OMEGA Control Center</title>
<style>body{font-family:system-ui,sans-serif;margin:0;padding:18px;color:CanvasText;background:Canvas}button,textarea,input{font:inherit}main{max-width:980px;margin:auto}textarea{width:100%;min-height:280px}nav{display:flex;gap:8px;flex-wrap:wrap}.card{border:1px solid color-mix(in srgb,CanvasText 18%,transparent);border-radius:12px;padding:14px;margin:12px 0}</style>
</head><body><main><h1>OMEGA Control Center</h1><nav><button id="sync">Sync model context</button><button id="reload">Reload file</button><button id="save">Save file</button></nav><section class="card"><div id="route"></div><textarea id="editor" aria-label="OMEGA file editor"></textarea></section><pre id="status"></pre></main>
<script type="module">
import { App } from '@modelcontextprotocol/ext-apps';
import { OpenAIExtensions } from '@openai/mcp-extensions/app';
const app = new App({ name: 'omega-control-center', version: '25.1.0' });
const ext = new OpenAIExtensions(app);
let resourceUri = null;
const status = document.querySelector('#status');
const editor = document.querySelector('#editor');
function setStatus(v){status.textContent=typeof v==='string'?v:JSON.stringify(v,null,2)}
async function loadFile(){ if(!resourceUri||!ext.resources) return; const r=await ext.resources?.read({uri:resourceUri}); const c=r?.contents?.[0]; if(c?.text!=null) editor.value=c.text; editor.dataset.etag=c?.openaiMetadata?.etag??''; editor.dataset.writable=String(Boolean(c?.openaiMetadata?.writable)); }
async function saveFile(){ if(!resourceUri||!ext.resources||editor.dataset.writable!=='true') return setStatus('File is read-only on this host.'); const out=await ext.resources?.write(resourceUri,{text:editor.value,...(editor.dataset.etag?{ifMatch:editor.dataset.etag}:{})}); setStatus(out); if(out?.outcome==='conflict') await loadFile(); }
function syncDeepLink(){ const d=ext.deepLink.getCurrent(); document.querySelector('#route').textContent=d?.url?('Route: '+d.url):'Route: /'; }
app.ontoolinput=(input)=>{ resourceUri=input?.file?.resourceUri??resourceUri; void loadFile(); };
app.ontoolresult=(result)=>{ setStatus(result?.structuredContent??result); };
app.addEventListener('hostcontextchanged',()=>{ syncDeepLink(); const current=ext.modelContext?.getCurrent(); if(current?.structuredContent?.resourceUri) resourceUri=current.structuredContent.resourceUri; });
document.querySelector('#sync').onclick=async()=>{ if(!ext.modelContext) return setStatus('Model context unavailable on this host.'); const update=await ext.modelContext.update({content:[{type:'text',text:'OMEGA Control Center current selection.'}],structuredContent:{resourceUri,route:ext.deepLink.getCurrent()?.url??'/'}}); setStatus(update??'context updated'); };
document.querySelector('#reload').onclick=()=>void loadFile();
document.querySelector('#save').onclick=()=>void saveFile();
await app.connect(); syncDeepLink(); const current=ext.modelContext?.getCurrent(); if(current?.structuredContent?.resourceUri) resourceUri=current.structuredContent.resourceUri; void loadFile();
</script></body></html>`;
}
