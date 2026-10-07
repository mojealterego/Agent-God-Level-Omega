import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import { RESOURCE_MIME_TYPE, registerAppResource, registerAppTool } from '@modelcontextprotocol/ext-apps/server';
import { OpenAIExtensions } from '@openai/mcp-extensions/server';
import * as z from 'zod/v4';
import { BlobSubscriptionStore } from './blob-subscription-store.mjs';
import { BlobJsonStore } from './blob-json-store.mjs';
import { OpenAIMcpEventService, OMEGA_EVENT_DEFINITIONS } from './events-runtime.mjs';
import { buildMentionItems, buildOmegaForm, buildOmegaResourceMetadata, buildOmegaUiMetadata, OMEGA_UI_URI } from './extensions-ui.mjs';
import { OMEGA_CONTROL_CENTER_HTML } from './generated-control-center.mjs';

const subscriptions=new BlobSubscriptionStore();
const settingsStore=new BlobJsonStore({prefix:'omega/openai/settings/'});
const events=new OpenAIMcpEventService({store:subscriptions});
const mentionCatalog=[
  {uri:'omega://capability/wda',name:'WDA Ω∞',description:'Visual control plane'},
  {uri:'omega://capability/reality-filter',name:'Reality Filter',description:'Evidence and claim verification'},
  {uri:'omega://capability/media',name:'Media Architect',description:'Voice, audio, image and video workflows'},
  {uri:'omega://capability/assurance',name:'Assurance Architect',description:'CI, release and supply-chain gates'},
  {uri:'omega://capability/voice-concierge',name:'Voice Concierge',description:'Plan-only voice communication orchestration'}
];
const defaultSettings={mode:'evidence-first',requireExternalWriteApproval:true,requireCreditApproval:true};
const EventListParams=z.object({cursor:z.string().nullable().optional()}).default({});
const EventSubscribeParams=z.object({name:z.string().min(1),arguments:z.record(z.string(),z.unknown()).default({}),delivery:z.object({mode:z.literal('webhook'),url:z.string().url(),secret:z.string().min(1)}),cursor:z.string().nullable().optional(),ttlMs:z.number().int().positive().nullable().optional()});
const EventUnsubscribeParams=z.object({name:z.string().min(1),arguments:z.record(z.string(),z.unknown()).default({}),delivery:z.object({mode:z.literal('webhook'),url:z.string().url()})});
const subjectFor=ctx=>String(ctx?.authInfo?.clientId??process.env.OMEGA_MCP_SUBJECT??'omega-private-plugin');

export function createOmegaRemoteServer(){
  const server=new McpServer({name:'omega-control-plane',version:'25.0.0'},{capabilities:{events:{}}});
  const openai=new OpenAIExtensions(server);

  registerAppResource(server,'omega-control-center',OMEGA_UI_URI,{},async()=>({contents:[{uri:OMEGA_UI_URI,mimeType:RESOURCE_MIME_TYPE,text:OMEGA_CONTROL_CENTER_HTML,_meta:buildOmegaResourceMetadata()}]}));
  registerAppTool(server,'omega.control-center',{description:'Open the OMEGA Control Center for capabilities, settings, context and supported file workflows.',inputSchema:z.object({}),_meta:buildOmegaUiMetadata()},async()=>({content:[{type:'text',text:'OMEGA Control Center opened.'}],structuredContent:{version:'25.0.0',events:OMEGA_EVENT_DEFINITIONS.map(x=>x.name),hostSupport:{global:true,thread:true,settings:true,file:'desktop',mentions:'desktop',richForms:'desktop-web',deepLinks:'desktop-web-ios'}}}));

  server.registerTool('omega.remote.status',{description:'Report the hosted OMEGA MCP 2.0 bridge state without claiming local-machine capabilities.',inputSchema:z.object({})},async()=>({content:[{type:'text',text:'OMEGA hosted bridge is active.'}],structuredContent:{version:'25.0.0',protocol:'2026-07-28',persistence:'vercel-blob-private',events:OMEGA_EVENT_DEFINITIONS.map(x=>x.name)}}));

  server.registerTool('omega.configure',{description:'Collect structured OMEGA operating preferences using a rich form when the host supports MRTR.',inputSchema:z.object({})},async()=>{
    const result=await openai.elicitInput({mode:'form',message:'Configure OMEGA operating mode and approval gates.',requestedSchema:buildOmegaForm([
      {id:'evidence-first',title:'Evidence first',description:'Require observed evidence before success claims'},
      {id:'high-autonomy',title:'High autonomy',description:'Execute reversible work automatically while preserving approval gates'},
      {id:'review-heavy',title:'Review heavy',description:'Prefer explicit review before consequential operations'}
    ])});
    return {content:[{type:'text',text:`OMEGA configuration form: ${result.action}`}],structuredContent:result};
  });

  openai.settings?.register({
    fields:{
      mode:{schema:z.enum(['evidence-first','high-autonomy','review-heavy']),title:'OMEGA operating mode'},
      requireExternalWriteApproval:{schema:z.boolean(),title:'Approve external writes'},
      requireCreditApproval:{schema:z.boolean(),title:'Approve provider credit spend'}
    },
    layout:[{kind:'group',title:'Execution',items:[{kind:'property',property:'mode'},{kind:'property',property:'requireExternalWriteApproval'},{kind:'property',property:'requireCreditApproval'}]}],
    read:async extra=>await settingsStore.get(subjectFor(extra),defaultSettings),
    update:async (set,extra)=>{const key=subjectFor(extra);const current=await settingsStore.get(key,defaultSettings);const next={...current,...set};await settingsStore.put(key,next);return next;}
  });
  openai.mentions?.setHandler(async({query})=>({items:buildMentionItems(mentionCatalog,query)}));

  server.server.setRequestHandler('events/list',{params:EventListParams,result:z.any()},async()=>events.list());
  server.server.setRequestHandler('events/subscribe',{params:EventSubscribeParams,result:z.any()},async(params,ctx)=>await events.subscribe({subject:subjectFor(ctx),...params}));
  server.server.setRequestHandler('events/unsubscribe',{params:EventUnsubscribeParams,result:z.any()},async(params,ctx)=>await events.unsubscribe({subject:subjectFor(ctx),...params}));
  return server;
}

export const omegaMcpHandler=createMcpHandler(()=>createOmegaRemoteServer(),{legacy:'stateless',maxRequestBodySize:1024*1024});
export { events as omegaEventService };
