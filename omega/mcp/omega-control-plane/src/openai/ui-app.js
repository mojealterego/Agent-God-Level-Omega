import { App, applyDocumentTheme, applyHostStyleVariables } from '@modelcontextprotocol/ext-apps';
import { OpenAIExtensions, OpenAIFileEntrypointInputSchema } from '@openai/mcp-extensions/app';

const app=new App({name:'omega-control-center',version:'25.0.0'});
const ext=new OpenAIExtensions(app);
let resourceUri=null;
const $=s=>document.querySelector(s);
const status=$('#status'), editor=$('#editor'), route=$('#route');
const setStatus=v=>{ status.textContent=typeof v==='string'?v:JSON.stringify(v,null,2); };
function applyHost(){ const c=app.getHostContext(); if(c?.theme) applyDocumentTheme(c.theme); if(c?.styles?.variables) applyHostStyleVariables(c.styles.variables); const d=ext.deepLink?.getCurrent?.(); route.textContent=d?.url?`Route: ${d.url}`:'Route: /'; }
async function load(){ if(!resourceUri||!ext.resources) return; const r=await ext.resources.read({uri:resourceUri}); const c=r?.contents?.[0]; if(c && 'text' in c){editor.value=c.text??'';editor.dataset.etag=c.openaiMetadata?.etag??'';editor.dataset.writable=String(Boolean(c.openaiMetadata?.writable));} }
async function save(){ if(!resourceUri||!ext.resources||editor.dataset.writable!=='true') return setStatus('File is read-only on this host.'); const r=await ext.resources.write(resourceUri,{text:editor.value,...(editor.dataset.etag?{ifMatch:editor.dataset.etag}:{})}); setStatus(r); if(r?.outcome==='conflict') await load(); }
async function sync(){ if(!ext.modelContext) return setStatus('Model context unavailable on this host.'); const r=await ext.modelContext.update({content:[{type:'text',text:'OMEGA Control Center current selection.'}],structuredContent:{resourceUri,route:ext.deepLink?.getCurrent?.()?.url??'/'}}); setStatus(r??'context updated'); }
app.addEventListener('toolinput',async ({arguments:args})=>{ const parsed=OpenAIFileEntrypointInputSchema.safeParse(args); if(parsed.success){resourceUri=parsed.data.file.resourceUri;await load();} });
app.addEventListener('hostcontextchanged',()=>{applyHost(); const current=ext.modelContext?.getCurrent?.(); if(current?.structuredContent?.resourceUri) resourceUri=current.structuredContent.resourceUri;});
app.ontoolresult=result=>setStatus(result?.structuredContent??result);
$('#sync').onclick=()=>void sync(); $('#reload').onclick=()=>void load(); $('#save').onclick=()=>void save();
await app.connect(); applyHost(); const current=ext.modelContext?.getCurrent?.(); if(current?.structuredContent?.resourceUri) resourceUri=current.structuredContent.resourceUri; await load();
