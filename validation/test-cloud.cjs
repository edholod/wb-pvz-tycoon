const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const source=fs.readFileSync(__dirname+'/../cloud-sync.js','utf8');
const payload={ 'wbpvz-demo-v18':JSON.stringify({balance:53878,gameMinute:100,opened:true})};
const fresh={ 'wbpvz-demo-v18':JSON.stringify({balance:500000,gameMinute:0,opened:false})};
const wait=()=>new Promise(r=>setImmediate(r));
function setup({uid=1,platform='web',local=fresh,remote=null,metadata={},fail=false,startup=null,quota=Infinity,legacyCrypto=false}={}){
 let save=remote&&structuredClone(remote), calls=[],timers=[],events={},reloads=0;
 const storage=new Map(Object.entries(local));storage.set('wbcloud-meta-'+uid,JSON.stringify(metadata));
 const elements=new Map();
 function el(){return {style:{},children:[],append(...x){this.children.push(...x)},appendChild(x){this.children.push(x);return x},replaceChildren(){this.children=[]},after(){},remove(){},set id(v){this._id=v;elements.set(v,this)},get id(){return this._id}}}
 const doc={body:el(),hidden:false,createElement:el,getElementById:id=>elements.get(id),querySelector:()=>el(),querySelectorAll:()=>startup?[{textContent:"fixture",after(){if(startup==='error')events.error({error:Error('startup fixture')});else storage.set('wbpvz-demo-v18',JSON.stringify({balance:53700,gameMinute:160,opened:true}))}}]:[],addEventListener:(k,v)=>events[k]=v};
 const ctx={console,crypto:legacyCrypto?{getRandomValues:a=>require('crypto').webcrypto.getRandomValues(a)}:require('crypto').webcrypto,AbortController,structuredClone,setTimeout,clearTimeout,navigator:{onLine:true},location:{reload(){reloads++}},document:doc,localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>{const total=[...storage.entries()].filter(([key])=>key!==k).reduce((sum,[key,value])=>sum+key.length+value.length,0)+k.length+v.length;if(total>quota){const e=Error('The quota has been exceeded.');e.name='QuotaExceededError';throw e}storage.set(k,v)},removeItem:k=>storage.delete(k)},Telegram:{WebApp:{initData:'signed-fixture',initDataUnsafe:{user:{id:uid}},platform}},setInterval:(fn,ms)=>{timers.push({fn,ms});return timers.length},addEventListener:(k,v)=>events[k]=v};
 ctx.removeEventListener=(k,v)=>{if(events[k]===v)delete events[k]};ctx.window=ctx;
 ctx.fetch=async(url,opts)=>{const b=JSON.parse(opts.body);calls.push(b);let code=200,result;
  if(fail)throw Error('offline');
  if(b.action==='cloud_load')result={save:save&&structuredClone(save)};
  else if(b.action==='cloud_claim'){if(!save||save.revision!==b.revision){code=409;result={error:'Cloud conflict'}}else{save.writer_id=b.writerId;result={save:{revision:save.revision}}}}
  else if(b.action==='cloud_save'){if(!save&&b.revision===0){save={revision:1,writer_id:b.writerId,payload:b.payload};result={save:{revision:1}}}else if(save&&save.revision===b.revision&&save.writer_id===b.writerId){save={...save,revision:save.revision+1,payload:b.payload};result={save:{revision:save.revision}}}else{code=409;result={error:'Cloud conflict'}}}
  return {ok:code===200,status:code,json:async()=>result};
 };
 vm.runInNewContext(source,ctx);
 return {ctx,storage,calls,timers,elements,events,get save(){return save},set save(v){save=v},get reloads(){return reloads}};
}
(async()=>{
 let t=setup({remote:{revision:4,writer_id:'old',payload}});await wait();await wait();
 assert.equal(JSON.parse(t.storage.get('wbpvz-demo-v18')).balance,53878);assert.equal(t.save.revision,4);assert.equal(t.calls.filter(c=>c.action==='cloud_save').length,0);
 t.ctx.wbCloudSnapshot=()=>({...payload,'wbpvz-demo-v18':JSON.stringify({balance:53000,gameMinute:101,opened:true})});await t.timers.find(t=>t.ms===10000).fn();await wait();assert.equal(t.save.revision,5);assert.equal(JSON.parse(t.save.payload['wbpvz-demo-v18']).balance,53000);
 t.save={...t.save,revision:6,writer_id:'other'};t.ctx.wbCloudSnapshot=()=>fresh;await t.timers.find(t=>t.ms===10000).fn();await wait();assert.equal(t.save.revision,6);assert.notEqual(JSON.parse(t.save.payload['wbpvz-demo-v18']).balance,500000);assert(t.storage.has('wbcloud-recovery-1'));
 // Cloud restore must not create a redundant full-size recovery snapshot on iOS.
 t=setup({local:payload,remote:{revision:4,writer_id:'old',payload},quota:400});await wait();await wait();
 assert.equal(JSON.parse(t.storage.get('wbpvz-demo-v18')).balance,53878);
 assert(!t.storage.has('wbcloud-recovery-1'));
 t=setup({uid:456956528,local:fresh});await wait();assert.equal(t.calls.length,1);assert.equal(t.save,null);assert(!t.calls.some(c=>c.action==='cloud_save'));
 t=setup({uid:456956528,platform:'ios',local:payload});await wait();assert.equal(t.save,null);const card=t.elements.get('wbcloud-overlay').children[0];await card.children[2].onclick();await wait();assert.equal(t.save.revision,1);assert.equal(JSON.parse(t.save.payload['wbpvz-demo-v18']).balance,53878);
 t=setup({local:payload,metadata:{revision:2,dirty:true},remote:{revision:3,writer_id:'other',payload:fresh}});await wait();assert.equal(JSON.parse(t.storage.get('wbpvz-demo-v18')).balance,53878);assert(!t.calls.some(c=>c.action==='cloud_claim'||c.action==='cloud_save'));
 t=setup({local:payload,metadata:{revision:3,dirty:true},remote:{revision:3,writer_id:'old',payload:fresh}});await wait();await wait();assert.equal(t.save.revision,4);assert.equal(JSON.parse(t.save.payload['wbpvz-demo-v18']).balance,53878);
 t=setup({local:payload,fail:true});await wait();assert.equal(JSON.parse(t.storage.get('wbpvz-demo-v18')).balance,53878);assert(!t.calls.some(c=>c.action==='cloud_save'));
 t=setup({startup:'error',remote:{revision:4,writer_id:'old',payload}});await wait();await wait();await t.timers.find(t=>t.ms===10000).fn();assert.equal(t.save.revision,4);assert(!t.calls.some(c=>c.action==='cloud_save'));
 t=setup({startup:'change',remote:{revision:4,writer_id:'old',payload}});await wait();await wait();await t.timers.find(t=>t.ms===10000).fn();assert.equal(t.save.revision,5);assert.equal(JSON.parse(t.save.payload['wbpvz-demo-v18']).gameMinute,160);
 t=setup({legacyCrypto:true,remote:{revision:4,writer_id:'old',payload}});await wait();await wait();assert.match(t.calls.find(c=>c.action==='cloud_claim').writerId,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
 console.log('PASS: secure UUID fallback;  startup failures cannot write; catchup changes saved;  cloud restore, autosave, stale writer rejection, owner PC protection, phone migration, dirty conflict, dirty retry, network failure');
})().catch(e=>{console.error(e);process.exitCode=1});
