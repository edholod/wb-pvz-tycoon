const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto');
let source=fs.readFileSync(__dirname+'/../supabase/functions/game-leaderboard/index.ts','utf8').replace(/^import.*;$/m,'');
source=require('module').stripTypeScriptTypes(source);
const token='123456:fixture-only';let handler;
const context={crypto:crypto.webcrypto,TextEncoder,URLSearchParams,Response,Date,Number,JSON,console:{log(){},warn(){},error(){}},Deno:{env:{get:k=>k==='TELEGRAM_BOT_TOKEN'?token:'fixture'},serve:fn=>handler=fn},createClient:()=>({from:()=>{throw Error('DB must not be called in invalid-data tests')}})};
vm.createContext(context);new vm.Script(source).runInContext(context);
function signed(overrides={}){const p=new URLSearchParams({auth_date:String(Math.floor(Date.now()/1000)),user:JSON.stringify({id:1}),signature:'fixture-signature',...overrides});const check=[...p].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>k+'='+v).join('\n');const secret=crypto.createHmac('sha256','WebAppData').update(token).digest();p.set('hash',crypto.createHmac('sha256',secret).update(check).digest('hex'));return p.toString()}
(async()=>{
 const good=signed();assert.equal((await context.verifyTelegram(good)).id,1);assert.equal(await context.verifyTelegram(good.replace('fixture-signature','modified')),null);assert.equal(await context.verifyTelegram(signed({auth_date:'1'})),null);
 assert(context.validCloudPayload({'wbpvz-demo-v18':JSON.stringify({balance:1,gameMinute:1})}));assert(!context.validCloudPayload({'wbpvz-demo-v18':JSON.stringify({balance:1,gameMinute:1}),evil:'{}'}));assert(!context.validCloudPayload({'wbpvz-demo-v18':'null'}));assert(!context.validCloudPayload({'wbpvz-demo-v18':JSON.stringify({balance:1,gameMinute:1}),'wbpvz-portfolio-v134':JSON.stringify({active:7,branches:[]})}));
 const ranking=context.rankingFromSave({'wbpvz-demo-v18':JSON.stringify({balance:123,gameMinute:100,opened:true,quest35:{xp:250}})}, {id:1,first_name:'Тест'});assert.equal(ranking.score,250);assert.equal(ranking.pvz_count,1);assert.equal(context.rankingPeriods(new Date('2026-11-03T10:00:00Z'))[1].period_start,'2026-11-02');
 assert.equal(context.rankingFromSave({'wbpvz-demo-v18':JSON.stringify({balance:1,gameMinute:1,quest35:{xp:500}}),'wbpvz-privacy-v147':JSON.stringify({name:false,xp:false,branches:false})},{id:1,first_name:'Secret'}).display_name,'Игрок');
 const privateRank=context.rankingFromSave({'wbpvz-demo-v18':JSON.stringify({balance:1,gameMinute:1}),'wbpvz-privacy-v147':JSON.stringify({xp:false,branches:false})},{id:1});assert.equal(privateRank.is_public,false);assert.equal(privateRank.pvz_count,null);
 const r=await handler(new Request('https://example.test',{method:'POST',body:JSON.stringify({action:'cloud_load',initData:''})}));assert.equal(r.status,401);

 context.createClient=()=>({from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{payload:{'wbpvz-demo-v18':JSON.stringify({balance:1,gameMinute:1,goodsLedger:{__wbLedger212:['fixture']}})}},error:null})})})})});
 for(const [clientVersion,status] of [[0,426],[212,200]]){const result=await handler(new Request('https://example.test',{method:'POST',body:JSON.stringify({action:'cloud_load',initData:good,clientVersion})}));assert.equal(result.status,status)}
 const rows=Array.from({length:120},(_,i)=>({telegram_id:i+2,display_name:'P'+i,score:1000-i,pvz_count:1,player_level:3,is_public:true}));
 rows.push({telegram_id:1,display_name:'Me',score:1,pvz_count:1,player_level:1,is_public:true});
 class Query {
  constructor(table){this.table=table;this.filters=[];this.orders=[];this.cap=Infinity}
  select(fields,opts){this.opts=opts;return this}eq(k,v){if(!['period','period_start'].includes(k))this.filters.push(r=>r[k]===v);return this}in(k,values){this.filters.push(r=>values.includes(r[k]));return this}gt(k,v){this.filters.push(r=>r[k]>v);return this}order(k,opts){this.orders.push([k,opts]);return this}limit(n){this.cap=n;return this}
  result(one=false){let data=this.table==='game_cloud_saves'?[]:this.table==='game_profile_ids_v212'?[]:rows.filter(r=>this.filters.every(f=>f(r)));const count=data.length;for(const [k,o] of [...this.orders].reverse())data.sort((a,b)=>(a[k]<b[k]?-1:a[k]>b[k]?1:0)*(o.ascending?1:-1));return {data:one?(data[0]||null):data.slice(0,this.cap),count,error:null}}
  maybeSingle(){return Promise.resolve(this.result(true))}then(resolve,reject){return Promise.resolve(this.result()).then(resolve,reject)}
 }
 context.createClient=()=>({from:table=>new Query(table)});
 let boardReply=await handler(new Request('https://example.test',{method:'POST',body:JSON.stringify({action:'leaderboard',period:'all',initData:good})}));assert.equal(boardReply.status,200);let board=await boardReply.json();assert.equal(board.leaderboard.length,100);assert.equal(board.my_rank.place,121);assert.equal(board.leaderboard[0].telegram_id,undefined);assert.equal(board.leaderboard[0].place,1);
 rows.find(r=>r.telegram_id===1).is_public=false;
 boardReply=await handler(new Request('https://example.test',{method:'POST',body:JSON.stringify({action:'leaderboard',initData:good})}));board=await boardReply.json();assert.equal(board.my_rank,null);assert.equal(board.hidden,true);
 assert.equal(await context.publishRanking({rpc:async()=>({error:{code:'fixture'}})}, {'wbpvz-demo-v18':JSON.stringify({balance:1,gameMinute:1})},{id:1},1),false);
 console.log('PASS: personal place outside top 100, hidden XP, no raw Telegram IDs, publication failure isolation');
 console.log('PASS: HMAC includes signature, tampering rejected, expired auth rejected, payload allowlist, network shape, unauthorized request rejected');
})().catch(e=>{console.error(e);process.exitCode=1});
