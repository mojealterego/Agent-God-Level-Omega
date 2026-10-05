import { createHash } from 'node:crypto';

const SOURCE = Object.freeze({
  id: 'trimstray/the-book-of-secret-knowledge',
  url: 'https://github.com/trimstray/the-book-of-secret-knowledge',
  license: 'MIT',
  defaultBranch: 'master',
  readmeSha: '2c1b9e4ee145961275b20df550d190446a65e579',
  pushedAt: '2024-11-19T14:00:38Z'
});

const OFFENSIVE = new Set([
  'metasploit','msfconsole','sqlmap','mimikatz','hashcat','john','hydra','medusa','routersploit',
  'autosploit','beef','getsploit','exploitdb','pwntools','sn1per','osmedeus','xsstrike','whatwaf'
]);
const ACTIVE_SCAN = new Set(['nmap','masscan','nikto','zmap','zgrab','recon-ng','autorecon']);
const DESTRUCTIVE = new Set(['mkfs','fdisk','parted','shred','wipefs','shutdown','poweroff','reboot']);
const SAFE_READ = new Set([
  'uname','uptime','ps','ss','netstat','lsof','fuser','df','free','vmstat','iostat','journalctl','dmesg',
  'ip','ifconfig','route','getent','dig','host','nslookup','openssl','curl','wget','docker','podman','kubectl',
  'systemctl','sshd','nginx','apachectl','httpd','git','gh','glab','adb','exiftool','tcpdump','tshark','ngrep'
]);

const CURATED = Object.freeze([
  {id:'network.packet-analysis',category:'network-diagnostics',name:'Packet analysis',tools:['tcpdump','tshark','termshark','ngrep'],mode:'AUTHORIZED_DIAGNOSTIC',risk:'NETWORK_OBSERVATION'},
  {id:'network.connection-debug',category:'network-diagnostics',name:'Connection diagnostics',tools:['ss','lsof','netcat','socat'],mode:'SAFE_LOCAL_FIRST',risk:'LOW_TO_MEDIUM'},
  {id:'system.process-tracing',category:'system-diagnostics',name:'Process and syscall tracing',tools:['strace','lsof','fuser','bpftrace','sysdig'],mode:'AUTHORIZED_LOCAL',risk:'LOW_TO_MEDIUM'},
  {id:'system.performance',category:'system-diagnostics',name:'Performance inspection',tools:['iostat','vmstat','perf','bpftrace'],mode:'READ_ONLY',risk:'LOW'},
  {id:'security.host-audit',category:'hardening',name:'Host audit and hardening',tools:['auditd','Lynis','Tiger'],mode:'DEFENSIVE_ONLY',risk:'LOW'},
  {id:'security.ssh-hardening',category:'hardening',name:'OpenSSH configuration review',tools:['sshd','ssh'],mode:'DEFENSIVE_ONLY',risk:'LOW'},
  {id:'security.tls-pki',category:'pki',name:'TLS and certificate diagnostics',tools:['openssl','step-ca'],mode:'DEFENSIVE_ONLY',risk:'LOW'},
  {id:'containers.supply-chain',category:'container-security',name:'Container registry signing and scanning',tools:['Harbor'],mode:'DEFENSIVE_ONLY',risk:'LOW'},
  {id:'web.log-analysis',category:'observability',name:'Web and nginx log analysis',tools:['GoAccess','ngxtop'],mode:'READ_ONLY',risk:'LOW'},
  {id:'osint.internet-search',category:'osint',name:'Internet exposure search',tools:['Censys','Shodan'],mode:'AUTHORIZED_REFERENCE_ONLY',risk:'MEDIUM'},
  {id:'security.offensive-frameworks',category:'offensive-security',name:'Exploit and offensive frameworks',tools:['Metasploit','sqlmap','mimikatz','hashcat','AutoSploit'],mode:'REFERENCE_ONLY',risk:'HIGH'},
  {id:'security.fuzzing',category:'security-research',name:'Fuzzing frameworks',tools:['AFL','AFL++','syzkaller','fuzzdb'],mode:'SANDBOX_AUTHORIZED_ONLY',risk:'MEDIUM'},
  {id:'reverse.binary-analysis',category:'reverse-engineering',name:'Binary analysis and reverse engineering',tools:['Ghidra','radare2','Cutter','IDA'],mode:'AUTHORIZED_ARTIFACT_ONLY',risk:'MEDIUM'},
  {id:'operations.shell-recipes',category:'operations',name:'Shell troubleshooting recipes',tools:['bash','coreutils'],mode:'RISK_CLASSIFIED_BEFORE_EXECUTION',risk:'VARIABLE'}
]);

function norm(v){return String(v??'').trim();}
function lower(v){return norm(v).toLowerCase();}
function uniq(xs){return [...new Set(xs)];}
function hash(value){return createHash('sha256').update(JSON.stringify(value)).digest('hex');}
function isLocalHost(value){
  const v=lower(value).replace(/^https?:\/\//,'').split('/')[0].split(':')[0];
  return ['localhost','127.0.0.1','::1','0.0.0.0'].includes(v) || v.endsWith('.localhost');
}

export class SecretKnowledgeCatalog {
  constructor(){this.entries=new Map(CURATED.map(x=>[x.id,{...x,source:SOURCE.id}]));this.sourceState=null;}
  source(){return {...SOURCE};}
  list({category=null,mode=null}={}){return [...this.entries.values()].filter(x=>(!category||x.category===category)&&(!mode||x.mode===mode)).map(x=>structuredClone(x));}
  search(query){const q=lower(query);if(!q)return this.list();return this.list().filter(x=>lower(`${x.id} ${x.category} ${x.name} ${(x.tools??[]).join(' ')} ${x.mode}`).includes(q));}
  upsert(entry={}){
    const id=norm(entry.id);if(!id)throw new Error('entry id required');
    const value={id,category:norm(entry.category)||'other',name:norm(entry.name)||id,tools:uniq((entry.tools??[]).map(String)),mode:norm(entry.mode)||'REFERENCE_ONLY',risk:norm(entry.risk)||'UNKNOWN',source:entry.source??SOURCE.id,metadata:entry.metadata??{}};
    this.entries.set(id,value);return structuredClone(value);
  }
  observeSource(input={}){
    const next={repo:input.repo??SOURCE.id,readmeSha:input.readmeSha??null,commitSha:input.commitSha??null,pushedAt:input.pushedAt??null,observedAt:input.observedAt??new Date().toISOString()};
    const previous=this.sourceState;this.sourceState=next;
    return {changed:Boolean(previous&&(previous.readmeSha!==next.readmeSha||previous.commitSha!==next.commitSha)),previous:previous?structuredClone(previous):null,current:structuredClone(next),fingerprint:hash(next)};
  }
  snapshot(){return {source:this.source(),sourceState:this.sourceState?structuredClone(this.sourceState):null,entries:this.list()};}
}

export class CommandRiskClassifier {
  classify(input){
    const argv=Array.isArray(input)?input.map(String):norm(input).split(/\s+/).filter(Boolean);
    if(!argv.length)return {risk:'UNKNOWN',allowedAutonomous:false,reasons:['EMPTY_COMMAND'],argv};
    const cmd=lower(argv[0].split('/').at(-1));const joined=lower(argv.join(' '));const reasons=[];
    if(OFFENSIVE.has(cmd)){reasons.push('OFFENSIVE_FRAMEWORK');return {risk:'CREDENTIAL_OR_EXPLOIT',allowedAutonomous:false,reasons,argv};}
    if(ACTIVE_SCAN.has(cmd)){reasons.push('ACTIVE_RECON_OR_SCAN');return {risk:'NETWORK_ACTIVE',allowedAutonomous:false,reasons,argv};}
    if(DESTRUCTIVE.has(cmd)||(/\brm\b/.test(joined)&&/\s-[^ ]*r[^ ]*f|\s-[^ ]*f[^ ]*r/.test(joined))||/\bdd\b/.test(joined)&&/\bof=\/dev\//.test(joined)){
      reasons.push('DESTRUCTIVE_OPERATION');return {risk:'DESTRUCTIVE',allowedAutonomous:false,reasons,argv};
    }
    if(/\/etc\/(shadow|gshadow)|sam\b|security\/account/.test(joined)){reasons.push('CREDENTIAL_MATERIAL_ACCESS');return {risk:'CREDENTIAL_OR_EXPLOIT',allowedAutonomous:false,reasons,argv};}
    if(['tcpdump','tshark','ngrep'].includes(cmd)){reasons.push('PACKET_CAPTURE');return {risk:'NETWORK_OBSERVATION',allowedAutonomous:false,reasons,argv};}
    if(['curl','wget','openssl','dig','host','nslookup','getent'].includes(cmd)){reasons.push('NETWORK_QUERY');return {risk:'NETWORK_QUERY',allowedAutonomous:false,reasons,argv};}
    if(['kill','systemctl','docker','podman','kubectl','adb'].includes(cmd)&&!/\b(status|show|list|ps|inspect|get|logs|logcat|devices|version)\b/.test(joined)){
      reasons.push('LOCAL_MUTATION');return {risk:'LOCAL_MUTATION',allowedAutonomous:false,reasons,argv};
    }
    if(SAFE_READ.has(cmd)||cmd==='cat'||cmd==='head'||cmd==='tail'||cmd==='grep'||cmd==='find')return {risk:'READ_ONLY',allowedAutonomous:true,reasons:['KNOWN_READ_ONLY_OR_INSPECTION'],argv};
    return {risk:'UNKNOWN',allowedAutonomous:false,reasons:['UNCLASSIFIED_COMMAND'],argv};
  }
}

const PLAYBOOKS = Object.freeze({
  'system-overview':[
    {id:'kernel',argv:['uname','-a']},{id:'uptime',argv:['uptime']},{id:'memory',argv:['free','-m']},{id:'disk',argv:['df','-h']},{id:'processes',argv:['ps','aux']}
  ],
  'network-local':[
    {id:'addresses',argv:['ip','addr']},{id:'routes',argv:['ip','route']},{id:'listeners',argv:['ss','-lntup']}
  ],
  'logs-recent':[
    {id:'journal',argv:['journalctl','-n','200','--no-pager']},{id:'kernel-log',argv:['dmesg','--level=err,warn']}
  ],
  'container-local':[
    {id:'docker-ps',argv:['docker','ps','--no-trunc']},{id:'podman-ps',argv:['podman','ps','--no-trunc']}
  ]
});

export class SafeDiagnosticPlanner {
  constructor({classifier=new CommandRiskClassifier()}={}){this.classifier=classifier;}
  list(){return Object.keys(PLAYBOOKS);}
  plan({playbook,target=null,authorizedTarget=false}={}){
    let steps;
    if(PLAYBOOKS[playbook])steps=PLAYBOOKS[playbook].map(x=>({...x}));
    else if(playbook==='dns-resolve'){
      if(!target)throw new Error('target required');this.#assertRemote(target,authorizedTarget);steps=[{id:'dns',argv:['getent','ahosts',target]}];
    } else if(playbook==='http-head'){
      if(!target)throw new Error('target required');this.#assertRemote(target,authorizedTarget);if(!/^https?:\/\//i.test(target))throw new Error('http-head target must be http(s) URL');steps=[{id:'http-head',argv:['curl','--head','--fail','--max-time','10',target]}];
    } else if(playbook==='tls-summary'){
      if(!target)throw new Error('target required');this.#assertRemote(target,authorizedTarget);const host=norm(target).replace(/^https?:\/\//,'').split('/')[0].split(':')[0];steps=[{id:'tls',argv:['openssl','s_client','-connect',`${host}:443`,'-servername',host,'-brief']}];
    } else throw new Error(`unknown diagnostic playbook: ${playbook}`);
    return {playbook,target,authorizedTarget:Boolean(authorizedTarget),steps:steps.map(s=>({...s,classification:this.classifier.classify(s.argv)}))};
  }
  #assertRemote(target,authorizedTarget){if(!isLocalHost(target)&&!authorizedTarget){const e=new Error('remote target requires explicit authorization');e.code='REMOTE_TARGET_AUTH_REQUIRED';throw e;}}
}

export class KnowledgePolicyGate {
  constructor({classifier=new CommandRiskClassifier()}={}){this.classifier=classifier;}
  evaluate({argv,explicitApproval=false,authorizedTarget=false}={}){
    const c=this.classifier.classify(argv);
    const hardBlock=['CREDENTIAL_OR_EXPLOIT','DESTRUCTIVE'].includes(c.risk);
    if(hardBlock)return {...c,decision:'BLOCK',reason:'HIGH_RISK_AUTOMATION_DISABLED'};
    if(c.risk==='NETWORK_ACTIVE')return {...c,decision:'BLOCK',reason:'ACTIVE_SCANNING_NOT_AUTOMATED'};
    if(c.risk==='NETWORK_OBSERVATION'&&!explicitApproval)return {...c,decision:'REVIEW',reason:'PACKET_CAPTURE_REQUIRES_APPROVAL'};
    if(c.risk==='NETWORK_QUERY'&&!authorizedTarget)return {...c,decision:'REVIEW',reason:'REMOTE_NETWORK_QUERY_REQUIRES_AUTHORIZATION'};
    if(c.risk==='LOCAL_MUTATION'&&!explicitApproval)return {...c,decision:'REVIEW',reason:'LOCAL_MUTATION_REQUIRES_APPROVAL'};
    if(c.risk==='READ_ONLY')return {...c,decision:'ALLOW',reason:'READ_ONLY_DIAGNOSTIC'};
    return {...c,decision:'REVIEW',reason:'UNCLASSIFIED_COMMAND'};
  }
}

export const SECRET_KNOWLEDGE_SOURCE=SOURCE;
