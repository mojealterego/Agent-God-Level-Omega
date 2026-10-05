import { createHash } from 'node:crypto';

function finite(v, fallback=0){ const n=Number(v); return Number.isFinite(n)?n:fallback; }
function clamp(v,min,max){ return Math.max(min,Math.min(max,v)); }
function mean(a){ return a.length?a.reduce((s,x)=>s+x,0)/a.length:0; }
function median(a){ if(!a.length)return 0; const x=[...a].sort((m,n)=>m-n); const i=Math.floor(x.length/2); return x.length%2?x[i]:(x[i-1]+x[i])/2; }
function cosine(a,b){ const n=Math.min(a.length,b.length); let d=0,aa=0,bb=0; for(let i=0;i<n;i++){d+=a[i]*b[i];aa+=a[i]*a[i];bb+=b[i]*b[i];} return aa&&bb?d/Math.sqrt(aa*bb):0; }

export class ClinicalJudgmentGate {
  assess({redFlags=[],confidence=0,measurements=[],risk='unknown'}={}){
    const urgentMeasurement = measurements.some(m => {
      const name=String(m.name??'').toLowerCase(), v=finite(m.value,NaN);
      if(name==='spo2' && v<90) return true;
      if(name==='systolic_bp' && (v<80 || v>200)) return true;
      if(name==='temperature_c' && (v<35 || v>40.5)) return true;
      return false;
    });
    const highRisk=redFlags.length>0||urgentMeasurement||['high','critical'].includes(risk);
    const action= highRisk ? 'URGENT_HUMAN_REVIEW' : confidence<0.98 ? 'HUMAN_REVIEW' : 'INFORMATIONAL_ONLY';
    return {action,redFlags:[...redFlags],urgentMeasurement,confidence,diagnosisGenerated:false,autonomousTreatment:false};
  }
}

export class CostEstimator {
  estimate({items=[],contingencyRate=0,currency='PLN'}={}){
    const rows=items.map(item=>{
      const q=Math.max(0,finite(item.quantity,1));
      const o=finite(item.optimistic),m=finite(item.mostLikely,o),p=finite(item.pessimistic,m);
      const expected=(o+4*m+p)/6;
      const variance=((p-o)/6)**2;
      return {...item,quantity:q,expectedUnit:expected,expected:expected*q,variance:variance*q*q};
    });
    const base=rows.reduce((s,x)=>s+x.expected,0), variance=rows.reduce((s,x)=>s+x.variance,0);
    const contingency=base*clamp(finite(contingencyRate),0,1);
    return {currency,base,contingency,total:base+contingency,stdDev:Math.sqrt(variance),items:rows};
  }
}

export class PrecisionEngine {
  stack(parts=[]){
    const nominal=parts.reduce((s,p)=>s+finite(p.nominal),0);
    const tolerances=parts.map(p=>Math.abs(finite(p.tolerance)));
    return {nominal,worstCaseTolerance:tolerances.reduce((s,x)=>s+x,0),rssTolerance:Math.sqrt(tolerances.reduce((s,x)=>s+x*x,0)),parts:parts.length};
  }
}

export class MultisensoryFusion {
  fuse(observations=[]){
    if(!observations.length) return {fused:null,confidence:0,conflict:false,observations:[]};
    const weighted=observations.map(o=>({...o,reliability:clamp(finite(o.reliability,0.5),0,1),value:finite(o.value)}));
    const w=weighted.reduce((s,x)=>s+x.reliability,0)||1;
    const fused=weighted.reduce((s,x)=>s+x.value*x.reliability,0)/w;
    const spread=Math.max(...weighted.map(x=>x.value))-Math.min(...weighted.map(x=>x.value));
    return {fused,confidence:clamp(mean(weighted.map(x=>x.reliability))*(1-clamp(spread,0,1)*0.5),0,1),conflict:spread>0.5,spread,observations:weighted};
  }
}

function expandedBox(b,c=0){ return {x:finite(b.x)-c,y:finite(b.y)-c,z:finite(b.z)-c,w:finite(b.w)+2*c,h:finite(b.h)+2*c,d:finite(b.d)+2*c}; }
function intersects(a,b){ return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y && a.z < b.z+b.d && a.z+a.d > b.z; }
export class InstallationPlanner3D {
  check({candidate,obstacles=[],bounds=null,clearance=0}={}){
    const box=expandedBox(candidate,Math.max(0,finite(clearance))); const violations=[];
    obstacles.forEach((o,i)=>{ if(intersects(box,o)) violations.push({code:'COLLISION',obstacle:i}); });
    if(bounds){ if(box.x<bounds.x||box.y<bounds.y||box.z<bounds.z||box.x+box.w>bounds.x+bounds.w||box.y+box.h>bounds.y+bounds.h||box.z+box.d>bounds.z+bounds.d) violations.push({code:'OUT_OF_BOUNDS'}); }
    return {valid:violations.length===0,violations,box};
  }
}

export class LegalContextGate {
  evaluate({jurisdiction,effectiveAt,sources=[],issueType='general',highImpact=false}={}){
    const missing=[]; if(!jurisdiction)missing.push('jurisdiction'); if(!effectiveAt)missing.push('effectiveAt'); if(!sources.length)missing.push('sources');
    return {allowed:missing.length===0 && (!highImpact || sources.some(s=>s.official===true)),missing,requiresOfficialSource:highImpact,issueType,legalAdviceGenerated:false};
  }
}

export class AffectivePolicy {
  select({signals={},taskRisk='low'}={}){
    const frustration=clamp(finite(signals.frustration),0,1), urgency=clamp(finite(signals.urgency),0,1), distress=clamp(finite(signals.distress),0,1);
    let style='neutral-precise';
    if(distress>0.7) style='calm-supportive'; else if(frustration>0.7||urgency>0.7) style='concise-supportive';
    if(['high','critical'].includes(taskRisk)) style='calm-explicit-boundaries';
    return {style,signals:{frustration,urgency,distress},claimsEmotion:false,subjectiveEmpathyClaimed:false};
  }
}

export class IncidentManager {
  classify({availabilityImpact=0,dataLoss=false,safetyImpact=false,scope='local',securityBreach=false}={}){
    let sev='SEV-4'; if(safetyImpact||securityBreach||dataLoss||scope==='global'||availabilityImpact>=0.8) sev='SEV-1'; else if(scope==='regional'||availabilityImpact>=0.5) sev='SEV-2'; else if(availabilityImpact>=0.2) sev='SEV-3';
    return {severity:sev,actions:['detect','contain','preserve-evidence','mitigate','recover','verify','postmortem'],blameless:true};
  }
}

export class RawInputInspector {
  inspect(buffer){
    const b=Buffer.from(buffer); let kind='binary';
    if(b.length>=4 && b[0]===0x89&&b[1]===0x50&&b[2]===0x4e&&b[3]===0x47) kind='png';
    else if(b.length>=4 && b[0]===0x50&&b[1]===0x4b&&b[2]===0x03&&b[3]===0x04) kind='zip';
    else if(b.length>=4 && b.toString('ascii',0,4)==='%PDF') kind='pdf';
    else if(b.length>=8 && b.toString('ascii',1,4)==='HDF') kind='hdf5';
    else if(b.length>=2 && b[0]===0xff&&b[1]===0xd8) kind='jpeg';
    return {kind,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')};
  }
}

export class PhaseSynchronizer {
  estimate(samples=[]){ const offsets=samples.map(s=>finite(s.remote)-finite(s.local)); const offsetMs=median(offsets); const jitterMs=median(offsets.map(x=>Math.abs(x-offsetMs))); return {offsetMs,jitterMs,samples:offsets.length}; }
}

export class CellularEvolutionMemory {
  constructor({width=8,height=8}={}){ this.width=width;this.height=height;this.generation=0;this.cells=new Map(); }
  #k(x,y){return `${x},${y}`;} seed(cells=[]){ for(const c of cells)this.cells.set(this.#k(c.x,c.y),{x:c.x,y:c.y,value:finite(c.value),fitness:finite(c.fitness)}); }
  evolve({mutationRate=0.05,steps=1,random=Math.random}={}){ for(let s=0;s<steps;s++){ const next=new Map(); for(let y=0;y<this.height;y++)for(let x=0;x<this.width;x++){ const cur=this.cells.get(this.#k(x,y))??{x,y,value:0,fitness:0}; const value=random()<mutationRate?1-cur.value:cur.value; next.set(this.#k(x,y),{...cur,value,fitness:cur.fitness+(value?0.001:0)}); } this.cells=next;this.generation++; } return {width:this.width,height:this.height,generation:this.generation,cells:[...this.cells.values()]}; }
}

export class EmotionalHomeostasis {
  constructor(){this.valence=0;this.arousal=0;} update({valence=0,arousal=0}={}){ this.valence=clamp(this.valence*0.7+finite(valence)*0.3,-1,1);this.arousal=clamp(this.arousal*0.7+finite(arousal)*0.3,0,1); return {valence:this.valence,arousal:this.arousal,subjectiveFeelingClaimed:false}; }
}

export class SpeciousPresent {
  constructor({windowMs=3000}={}){this.windowMs=windowMs;this.events=[];} add(event){this.events.push({...event});return event;} snapshot(now=Date.now()){ const min=now-this.windowMs; this.events=this.events.filter(e=>finite(e.at)>=min&&finite(e.at)<=now); return {windowMs:this.windowMs,events:[...this.events]}; }
}
export class DurationSense { constructor(){this.starts=new Map();} start(id,at=Date.now()){this.starts.set(id,at);return {id,at};} stop(id,at=Date.now()){if(!this.starts.has(id))throw new Error(`Unknown duration ${id}`);const start=this.starts.get(id);this.starts.delete(id);return {id,start,end:at,durationMs:at-start};} }

export class MasterGoalPolicy { constructor({goal,invariants=[]}={}){this.goal=goal;this.invariants=new Set(invariants);} evaluate({utility=0,violations=[]}={}){const blocking=violations.filter(v=>this.invariants.has(v));return {allowed:blocking.length===0,goal:this.goal,utility,blocking};} }

export class TemporalGapDetector { detect(timestamps,{expectedIntervalMs,tolerance=2}={}){const xs=[...timestamps].map(Number).sort((a,b)=>a-b);const gaps=[];for(let i=1;i<xs.length;i++){const d=xs[i]-xs[i-1];if(d>expectedIntervalMs*tolerance)gaps.push({from:xs[i-1],to:xs[i],gapMs:d,missingEstimate:Math.max(0,Math.round(d/expectedIntervalMs)-1)});}return {gaps,count:gaps.length};} }
export class TrendTracker { constructor(){this.rows=[];} add(row){this.rows.push({at:finite(row.at),value:finite(row.value)});this.rows.sort((a,b)=>a.at-b.at);} stats(){ if(this.rows.length<2)return {velocityPerSecond:0,accelerationPerSecond2:0}; const a=this.rows.at(-2),b=this.rows.at(-1),v=(b.value-a.value)/((b.at-a.at)/1000||1); let acc=0;if(this.rows.length>=3){const z=this.rows.at(-3),v0=(a.value-z.value)/((a.at-z.at)/1000||1);acc=(v-v0)/((b.at-z.at)/2000||1);}return {velocityPerSecond:v,accelerationPerSecond2:acc};} }

export class MqttParser {
  parse(buffer){ const b=Buffer.from(buffer); if(b.length<2)throw new Error('MQTT packet too short'); const types=['RESERVED','CONNECT','CONNACK','PUBLISH','PUBACK','PUBREC','PUBREL','PUBCOMP','SUBSCRIBE','SUBACK','UNSUBSCRIBE','UNSUBACK','PINGREQ','PINGRESP','DISCONNECT','AUTH']; const type=b[0]>>4; let multiplier=1,remaining=0,pos=1,encoded; do{if(pos>=b.length)throw new Error('Malformed remaining length');encoded=b[pos++];remaining+=(encoded&127)*multiplier;multiplier*=128;}while((encoded&128)!==0&&multiplier<=128**4); const out={packetType:types[type]??'UNKNOWN',flags:b[0]&15,remainingLength:remaining,liveInterception:false}; if(type===3&&pos+2<=b.length){const len=b.readUInt16BE(pos);pos+=2;if(pos+len<=b.length)out.topic=b.toString('utf8',pos,pos+len);}return out; }
}
export class CoapParser { parse(buffer){const b=Buffer.from(buffer);if(b.length<4)throw new Error('CoAP packet too short');return {version:b[0]>>6,type:(b[0]>>4)&3,tokenLength:b[0]&15,code:b[1],messageId:b.readUInt16BE(2),liveInterception:false};} }
export class FixParser { parse(text){const sep=text.includes('\x01')?'\x01':'|';const out={};for(const field of String(text).split(sep)){const i=field.indexOf('=');if(i>0)out[field.slice(0,i)]=field.slice(i+1);}return out;} }

export class CharacterConsistency { compare(a,b){const similarity=cosine(a.map(Number),b.map(Number));return {similarity,consistent:similarity>=0.9,identityProven:false,requiresRealEmbeddingProvider:true};} }

export class DomainEvidencePolicy {
  evaluate({domain='general',sources=[],risk='low'}={}){ const highRiskDomains=new Set(['medical','legal','financial','veterinary','biotech','longevity']); const needs=highRiskDomains.has(domain)||['high','critical'].includes(risk); const allowed=!needs||sources.length>0; return {allowed,requiresSources:needs,requiresHumanReview:needs&&['high','critical'].includes(risk),domain}; }
}

export class MeasurementInterpreter {
  interpret({value,calibration={},reference=null,unit=null,uncertainty=null}={}){const corrected=(finite(value)+finite(calibration.offset))*finite(calibration.scale,1);let classification='unclassified';if(reference){classification=corrected<reference.min?'below-reference':corrected>reference.max?'above-reference':'within-reference';}return {corrected,unit,uncertainty,classification,diagnosisGenerated:false};}
}

export class EngineeringConstraintSolver {
  rank({candidates=[],constraints={},weights={}}={}){ return candidates.filter(c=>(constraints.minStrength==null||finite(c.strength)>=constraints.minStrength)&&(constraints.maxMass==null||finite(c.mass)<=constraints.maxMass)&&(constraints.maxCost==null||finite(c.cost)<=constraints.maxCost)).map(c=>({...c,score:Object.entries(weights).reduce((s,[k,w])=>s+finite(c[k])*finite(w),0)})).sort((a,b)=>b.score-a.score); }
}

export class EditorState {
  constructor({text=''}={}){this.text=String(text);this.revision=0;}
  patch({baseRevision,ops=[]}={}){if(baseRevision!==this.revision)throw new Error(`Revision conflict: expected ${this.revision}, got ${baseRevision}`);const sorted=[...ops].sort((a,b)=>b.start-a.start);for(const op of sorted){if(op.start<0||op.end<op.start||op.end>this.text.length)throw new Error('Invalid patch range');this.text=this.text.slice(0,op.start)+String(op.text??'')+this.text.slice(op.end);}this.revision++;return {text:this.text,revision:this.revision};}
}
