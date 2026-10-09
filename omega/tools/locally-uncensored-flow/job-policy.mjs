const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
const finite=(v,n)=>{const x=Number(v);if(!Number.isFinite(x))throw new Error(n+' must be finite');return x};

export function retryDelay({attempt=0,baseMs=1000,maxMs=60000}={}){
  const a=Math.max(0,Math.floor(finite(attempt,'attempt')));
  const base=Math.max(1,finite(baseMs,'baseMs'));
  const max=Math.max(base,finite(maxMs,'maxMs'));
  return Math.round(Math.min(max,base*(2**a)));
}

export function pollPlan({timeoutMs=300000,initialDelayMs=2000,maxDelayMs=30000,maxAttempts=30}={}){
  const delays=[];
  let elapsed=0;
  const limit=Math.max(1,Math.floor(maxAttempts));
  for(let attempt=0;attempt<limit;attempt++){
    const delay=Math.min(maxDelayMs,initialDelayMs*(2**Math.min(attempt,6)));
    if(elapsed+delay>timeoutMs)break;
    delays.push(delay);
    elapsed+=delay;
  }
  return {delays,totalWaitMs:elapsed,attempts:delays.length,timeoutMs};
}

export function routeWorkload(input={}){
  const operation=String(input.operation??'').trim();
  if(!operation)throw new Error('operation required');
  const localCapable=input.localCapable===true;
  const remoteCapable=input.remoteCapable===true;
  const privacyRequired=input.privacyRequired===true;
  const localLoad=clamp(finite(input.localLoad??0,'localLoad'),0,1);
  const remoteCost=clamp(finite(input.remoteCost??0.5,'remoteCost'),0,1);
  let route='BLOCKED';
  const reasons=[];

  if(privacyRequired&&localCapable){
    route='LOCAL';
    reasons.push('PRIVACY');
  }else if(localCapable&&(!remoteCapable||localLoad<0.7)){
    route='LOCAL';
    reasons.push('LOCAL_CAPABILITY');
  }else if(remoteCapable){
    route='REMOTE';
    reasons.push(localLoad>=0.7?'LOCAL_RESOURCE_PRESSURE':'REMOTE_CAPABILITY');
  }

  if(route==='REMOTE'&&remoteCost>0.9&&localCapable){
    route='LOCAL';
    reasons.push('REMOTE_COST');
  }

  return {operation,route,reasons,localLoad,remoteCost};
}
