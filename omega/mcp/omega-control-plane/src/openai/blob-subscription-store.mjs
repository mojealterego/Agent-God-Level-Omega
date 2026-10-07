const DEFAULT_PREFIX='omega/mcp-events/subscriptions/';

async function streamToText(stream){
  if(!stream) return '';
  return await new Response(stream).text();
}

export class BlobSubscriptionStore {
  constructor({blobApi=null,prefix=DEFAULT_PREFIX,maxSubscriptions=1024}={}){
    this.blobApi=blobApi;
    this.prefix=String(prefix);
    this.maxSubscriptions=maxSubscriptions;
  }
  async #api(){
    if(this.blobApi) return this.blobApi;
    this.blobApi=await import('@vercel/blob');
    return this.blobApi;
  }
  #path(id){
    const safe=String(id??'').trim();
    if(!/^sub_[0-9A-Za-z_-]+$/.test(safe)) throw new Error('Invalid subscription id');
    return `${this.prefix}${safe}.json`;
  }
  async get(id){
    const api=await this.#api();
    const out=await api.get(this.#path(id),{access:'private',useCache:false});
    if(!out || out.statusCode!==200 || !out.stream) return null;
    return JSON.parse(await streamToText(out.stream));
  }
  async put(record){
    const api=await this.#api();
    if(!record?.id) throw new Error('record.id is required');
    const existing=await this.get(record.id).catch(()=>null);
    if(!existing){
      const current=await this.list();
      if(current.length>=this.maxSubscriptions) throw new Error('Subscription capacity reached');
    }
    await api.put(this.#path(record.id),JSON.stringify(record),{
      access:'private',addRandomSuffix:false,allowOverwrite:true,contentType:'application/json'
    });
    return structuredClone(record);
  }
  async delete(id){
    const api=await this.#api();
    await api.del(this.#path(id));
  }
  async list(){
    const api=await this.#api();
    const records=[];
    let cursor;
    do {
      const page=await api.list({prefix:this.prefix,limit:1000,...(cursor?{cursor}:{})});
      for(const blob of page?.blobs??[]){
        const id=String(blob.pathname).slice(this.prefix.length).replace(/\.json$/,'');
        const record=await this.get(id).catch(()=>null);
        if(record) records.push(record);
        if(records.length>=this.maxSubscriptions) return records;
      }
      cursor=page?.cursor;
    } while(cursor);
    return records;
  }
}
