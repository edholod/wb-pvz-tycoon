/* WB PVZ TYCOON v1.95: authenticated cloud saves, one writer, optimistic concurrency. */
(function () {
'use strict';
const endpoint='https://duerixyhzapotoeclggz.supabase.co/functions/v1/game-leaderboard';
const publicKey='sb_publishable_fKE2S2rAz7VMa54rgO4uvQ_vyzFPwmV';
const keys=["wbpvz-demo-v18","wbpvz-portfolio-v134","wbpvz-daily-login-v138","wbpvz-time-boost-v141","wbpvz-collections-v145","wbpvz-profile-v146","wbpvz-privacy-v147","wbpvz-boost-earnings-v166","wbpvz-level-rewards-v167","wbpvz-bonuses-v173"];
const mainKey='wbpvz-demo-v18',networkKey='wbpvz-portfolio-v134';
const tg=window.Telegram&&window.Telegram.WebApp;
const auth=tg&&tg.initData||'';
const uid=String(tg&&tg.initDataUnsafe&&tg.initDataUnsafe.user&&tg.initDataUnsafe.user.id||'');
const metaKey='wbcloud-meta-'+uid;
const writerId=crypto.randomUUID();
let revision=0,meta={},ready=false,busy=false,running=false,paused=true,blocked=false,lastSnapshot='',status='Подключаем облако…';
let overlay;
const interval=window.setInterval.bind(window);
// Freeze game simulation while checking the cloud or when the tab is hidden.
window.setInterval=function(fn,delay,...args){return interval(()=>{if(!paused&&!document.hidden)fn(...args)},delay)};
function read(){const data={};for(const k of keys){const v=localStorage.getItem(k);if(v!==null)data[k]=v}return data}
function valid(data){try{if(!data||typeof data!=='object'||!data[mainKey])return false;for(const k of Object.keys(data)){if(!keys.includes(k)||typeof data[k]!=='string')return false;JSON.parse(data[k])}const s=JSON.parse(data[mainKey]);return s&&Number.isFinite(s.balance)&&Number.isFinite(s.gameMinute)}catch{return false}}
function storeMeta(){localStorage.setItem(metaKey,JSON.stringify(meta))}
function recover(data){if(!Object.keys(data).length)return;localStorage.setItem('wbcloud-recovery-'+uid,JSON.stringify({savedAt:new Date().toISOString(),data}))}
function apply(data){if(!valid(data))throw Error('Облачное сохранение повреждено. Локальные данные сохранены.');const old=read();recover(old);try{for(const k of keys){if(Object.hasOwn(data,k))localStorage.setItem(k,data[k]);else localStorage.removeItem(k)}}catch(e){for(const k of keys){if(Object.hasOwn(old,k))localStorage.setItem(k,old[k]);else localStorage.removeItem(k)}throw e}}
function opened(data){try{const s=JSON.parse(data[mainKey]||'null'),n=JSON.parse(data[networkKey]||'null');return !!(s&&s.opened||n&&n.branches&&n.branches.some(b=>b.state&&b.state.opened))}catch{return false}}
function screen(message,buttons=[]){paused=true;status=message;if(!overlay){overlay=document.createElement('div');overlay.id='wbcloud-overlay';overlay.style.cssText='position:fixed;inset:0;z-index:2147483647;background:#f7f5f9;display:flex;align-items:center;justify-content:center;padding:20px;font-family:system-ui;color:#35243e';document.body.appendChild(overlay)}overlay.replaceChildren();const card=document.createElement('div');card.style.cssText='max-width:450px;width:100%;padding:24px;border:1px solid #e8d9ef;border-radius:18px;background:white';const h=document.createElement('h2');h.textContent='Сохранение игры';const p=document.createElement('p');p.textContent=message;p.style.lineHeight='1.5';card.append(h,p);for(const [label,fn] of buttons){const b=document.createElement('button');b.textContent=label;b.style.cssText='display:block;width:100%;margin-top:10px;padding:13px;border:0;border-radius:10px;background:#8426b5;color:white;font:inherit;cursor:pointer';b.onclick=fn;card.appendChild(b)}overlay.appendChild(card)}
function clear(){overlay&&overlay.remove();overlay=null;paused=false;badge()}
function badge(){let el=document.getElementById('wbcloud-status');if(!el){el=document.createElement('div');el.id='wbcloud-status';el.style.cssText='font:11px system-ui;color:#74617e;padding:6px 14px;text-align:center;max-width:700px;margin:auto';const h=document.querySelector('main > header');if(h)h.after(el)}el.textContent=status}
async function request(action,extra={}){const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),15000);try{const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','apikey':publicKey,'Authorization':'Bearer '+publicKey},body:JSON.stringify({action,initData:auth,...extra}),signal:controller.signal});const result=await r.json();if(!r.ok){const e=Error(result.error||'Ошибка облака');e.code=r.status;throw e}return result}catch(e){if(e.name==='AbortError')throw Error('Сервер не ответил. Прогресс остаётся на устройстве.');throw e}finally{clearTimeout(timeout)}}
function launch(){
 if(running)return;running=true;lastSnapshot=JSON.stringify(read());
 let startupError=null;const onError=e=>{startupError=e.error||Error(e.message)};
 window.addEventListener('error',onError);
 try{for(const old of document.querySelectorAll('script[type="application/x-wbpvz"]')){const s=document.createElement('script');s.textContent=old.textContent;old.after(s);if(startupError)throw startupError}}
 catch(e){blocked=true;throw Error('Игра не запустилась: '+e.message+'. Облачное сохранение не изменено.')}
 finally{window.removeEventListener('error',onError)}
 ready=true;status=auth?'Проверяем изменения прогресса…':'Локальная игра · для синхронизации открой игру в Telegram';clear()
}
function flush(){if(typeof window.wbCloudSnapshot==='function')return window.wbCloudSnapshot();return read()}
function conflict(message){blocked=true;const data=read();try{recover(data);meta.dirty=true;storeMeta()}catch{}screen(message,[['Загрузить последнее сохранение из облака',()=>{try{meta.dirty=false;storeMeta();location.reload()}catch(e){screen(e.message)}}]])}
async function saveNow(){if(!ready||busy||blocked||!auth)return;busy=true;try{const payload=flush();const serialized=JSON.stringify(payload);if(serialized===lastSnapshot&&!meta.dirty)return;if(!valid(payload))throw Error('Не удалось собрать сохранение.');meta.dirty=true;meta.revision=revision;storeMeta();status='Сохраняем прогресс…';badge();const result=await request('cloud_save',{revision,writerId,payload});revision=result.save.revision;meta={revision,dirty:false};storeMeta();lastSnapshot=serialized;status='Синхронизировано · '+new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'});badge()}catch(e){if(e.code===409){conflict('Игра открыта на другом устройстве или в облаке появилась новая версия. Этот прогресс сохранён на устройстве отдельно.');return}paused=true;screen(e.code===401?'Срок входа истёк. Закрой игру и открой её заново через Telegram.':e.message+' Повторное подключение не перезапишет прогресс.',[['Повторить подключение',()=>resume()]])}finally{busy=false}}
async function resume(){if(busy||blocked)return;busy=true;screen('Проверяем последнее сохранение…');try{const {save}=await request('cloud_load');if(save&&save.revision!==revision){conflict('В облаке есть более новое сохранение. Локальный прогресс сохранён отдельно.');return}if(save){await request('cloud_claim',{revision,writerId})}clear()}catch(e){screen(e.message,[['Повторить',()=>resume()]])}finally{busy=false}}
async function create(local){try{screen('Загружаем прогресс этого устройства…');recover(local);launch();paused=true;const payload=flush();meta={revision:0,dirty:true};storeMeta();const result=await request('cloud_save',{revision:0,writerId,payload});revision=result.save.revision;meta={revision,dirty:false};storeMeta();lastSnapshot=JSON.stringify(payload);status='Синхронизировано с Telegram';clear()}catch(e){if(e.code===409){blocked=true;screen('В облаке уже есть сохранение. Локальные данные сохранены.',[['Проверить облако',()=>location.reload()]]);return}screen(e.message,[['Повторить',()=>location.reload()]])}}
async function boot(){screen('Подключаем сохранение Telegram…');try{if(!auth||!uid){launch();return}try{meta=JSON.parse(localStorage.getItem(metaKey)||'{}')}catch{meta={}}const local=read();const {save}=await request('cloud_load');if(!save){if(uid==='456956528'&&(!opened(local)||!['ios','android'].includes(tg.platform))){screen('Сначала открой обновлённую игру на телефоне со старым прогрессом. После его загрузки сюда автоматически придёт та же игра.',[['Проверить сохранение телефона',()=>boot()]]);return}if(opened(local)){screen('Найден прогресс на этом устройстве. Один раз выбери его как основное сохранение. После этого игра будет сохраняться автоматически.',[['Сохранить этот прогресс в облаке',()=>create(local)]]);return}await create(local);return}
revision=save.revision;
if(meta.dirty&&meta.revision!==revision){conflict('На устройстве остались неотправленные изменения, а в облаке уже есть другая версия. Локальная копия сохранена отдельно.');return}
if(!meta.dirty){apply(save.payload)}
await request('cloud_claim',{revision,writerId});meta={revision,dirty:!!meta.dirty};storeMeta();launch();if(meta.dirty){lastSnapshot='';await saveNow()}
}catch(e){screen(e.code===401?'Не удалось подтвердить вход. Закрой игру и открой её через кнопку Telegram.':e.message,[['Повторить подключение',()=>boot()]])}}
interval(()=>{if(ready&&!paused&&!document.hidden)saveNow()},10000);
interval(async()=>{if(!ready||paused||busy||blocked||!auth||document.hidden)return;busy=true;try{const {save}=await request('cloud_load');if(save&&(save.revision!==revision||save.writer_id!==writerId))conflict('Игра продолжена на другом устройстве. Здесь запись остановлена, чтобы сохранить актуальный прогресс.')}catch{}finally{busy=false}},20000);
document.addEventListener('visibilitychange',()=>{if(!auth)return;if(document.hidden){saveNow();paused=true}else if(ready&&!blocked){if(busy)setTimeout(()=>resume(),1000);else resume()}});
window.addEventListener('online',()=>{if(ready&&paused&&!blocked)resume()});
window.addEventListener('beforeunload',()=>{if(!ready||!auth||blocked)return;try{const data=flush();if(JSON.stringify(data)!==lastSnapshot){meta={revision,dirty:true};storeMeta()}}catch{}});
interval(()=>{if(ready&&paused&&!blocked&&!busy&&auth&&!document.hidden&&navigator.onLine)resume()},30000);
boot();
})();
