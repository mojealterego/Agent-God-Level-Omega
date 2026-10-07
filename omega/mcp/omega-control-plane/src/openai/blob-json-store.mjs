async function streamToText(stream){ return stream ? await new Response(stream).text() : ''; }
export class BlobJsonStore {
  constructor({blobApi=null,prefix='omega/state/'}={}){ this.blobApi=blobApi; this.prefix=prefix; }
  async #api(){ if(this.blobApi) return this.blobApi; this.blobApi=await import('@vercel/blob'); return this.blobApi; }
  #path(key){ const safe=String(key??'').replace(/[^A-Za-z0-9._-]/g,'_'); if(!safe) throw new Error('key is required'); return `${this.prefix}${safe}.json`; }
  async get(key,fallback=null){ const api=await this.#api(); const out=await api.get(this.#path(key),{access:'private',useCache:false}); if(!out||out.statusCode!==200||!out.stream) return structuredClone(fallback); return JSON.parse(await streamToText(out.stream)); }
  async put(key,value){ const api=await this.#api(); await api.put(this.#path(key),JSON.stringify(value),{access:'private',addRandomSuffix:false,allowOverwrite:true,contentType:'application/json'}); return structuredClone(value); }
}
