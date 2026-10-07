import { toNodeHandler } from '@modelcontextprotocol/node';
import { omegaMcpHandler } from '../src/openai/remote-server.mjs';
const nodeHandler=toNodeHandler(omegaMcpHandler,{onerror:error=>console.error('OMEGA MCP HTTP error',error)});
export default function handler(req,res){ return nodeHandler(req,res); }
