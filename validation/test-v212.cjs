const assert=require('node:assert/strict'),engine=require('./engine.cjs');
const c=engine(__dirname+'/../index.html');
function run(s){return c.run(s)}
run(`s.opened=true;s.balance=1e7;init210();branch212();company212();`);
// Arrival timestamps are tied to the actual acceptance time, including later days.
run(`s.goodsLedger={};s.goodsSerial=0;s.stock=0;s.capacity=20000;live31Arrive(23*1440,10000)`);
assert(run(`Object.values(s.goodsLedger).every(g=>g.pickupAt-g.accepted>=1440&&g.pickupAt-g.accepted<=14*1440)`));
run(`s.live32.supplies.tape=4;branch212().tapeOperations=0;for(let i=0;i<3;i++)consumeTape212()`);assert.equal(run('s.live32.supplies.tape'),4);run('consumeTape212()');assert.equal(run('s.live32.supplies.tape'),3);
// All monetary penalty routes; ordinary payroll, rent, purchases and existing fines stay untouched.
run(`company212().active.shield={from:Date.now()-100,until:Date.now()+60000};s.balance=100000`);
for(const label of ['Штраф за риск: пример','Удержание по делу №1','Зависший товар · списание по истечении 90 игровых дней','Спорный брак · списание по истечении 90 игровых дней','Подозрение на подмену · списание по истечении 90 игровых дней'])run(`tx(-1000,${JSON.stringify(label)})`);
assert.equal(run('s.balance'),100000);assert.equal(run('company212().saved'),5000);run(`tx(-300,'Аренда');tx(-200,'Закупка расходников')`);assert.equal(run('s.balance'),99500);
run(`company212().active.shield.until=Date.now()-1;tx(-1000,'Штраф за риск: пример')`);assert.equal(run('s.balance'),98500);
run(`company212().active.xp={from:Date.now()-1,until:Date.now()+60000};const xpBefore212=s.quest35.xp;xp163Grant(100,'fixture')`);assert.equal(run('s.quest35.xp-xpBefore212'),150);
// A second activation cannot consume a token or add duration while an effect is running.
run(`company212().inventory.income=2;activate212('income');const until212=company212().active.income.until;activate212('income')`);assert.equal(run('company212().inventory.income'),1);assert.equal(run('company212().active.income.until===until212'),true);
// Daily reward and attached bonus survive repeat taps.
run(`localStorage.removeItem(LOGIN38_KEY);company212().inventory.speed=0;const cashBeforeDaily212=s.balance;login38Claim();login38Claim()`);assert.equal(run('s.balance-cashBeforeDaily212'),500);assert.equal(run('company212().history.filter(x=>x.id===\'login:\'+login38Date()).length'),1);
// Autorestock is charged once per game hour and is all-or-nothing on insufficient balance.
run(`s.balance=100000;for(const k of Object.keys(SUPPLIES210))s.live32.supplies[k]=0;branch212().auto={enabled:true,lastAttempt:-1};auto212(1440);const afterAuto212=s.balance;auto212(1440)`);assert.equal(run('s.balance'),run('afterAuto212'));assert(run(`Object.keys(SUPPLIES210).every(k=>s.live32.supplies[k]===SUPPLIES210[k].pack)`));
run(`s.balance=0;for(const k of Object.keys(SUPPLIES210))s.live32.supplies[k]=0;auto212(1500)`);assert.equal(run('s.balance'),0);assert(run(`Object.keys(SUPPLIES210).every(k=>s.live32.supplies[k]===0)`));
// A rare award is permanent and a connected partner can never be awarded twice.
run(`s.partners210.connected={};branch212().wheelPartners=[];random212=()=>0;ty173Reward('Колесо удачи');ty173Reward('Колесо удачи')`);assert.equal(run('Object.keys(s.partners210.connected).length'),2);
// Actual wheel classification, deterministic grid over 1 million outcomes.
assert.equal(run(`(()=>{let count=0;for(let i=0;i<1000000;i++)if(wheelPartnerIndex212((i+.5)/1000000,2)>=0)count++;return count})()`),100);
assert.equal(run('wheelPartnerIndex212(.0001,2)'),-1);assert.equal(run('wheelPartnerIndex212(0,0)'),-1);assert.equal(run('wheelPartnerIndex212(.00009,1)'),0);
// Clock maps a real-time effect correctly during accelerated offline processing.
run(`s.work212.clockSegments=[{from:0,to:120,realFrom:100000,realTo:160000,mult:2}];company212().active.speed={from:120000,until:140000};eventReal212=clock212At(60)`);assert(run(`bonus212Active('speed')`));run(`eventReal212=clock212At(90)`);assert(!run(`bonus212Active('speed')`));run(`eventReal212=null`);
// Notifications still detect a new ID when history has reached its size cap.
run(`n211Queue=[];s.notifications=Array.from({length:300},(_,i)=>({id:'old'+i}));s.notificationSeen={};n211Active=true;notificationAdd('audit','fixture','fixture','test212')`);assert.equal(run('s.notifications.length'),300);assert.equal(run('n211Queue.length'),1);
// Existing equipment is preserved; Alice uses one upgrade path with credit for earlier level.
run(`s.balance=1e6;branch212().alice=0;const beforeAlice212=s.balance;alice212Buy();alice212Buy()`);assert.equal(run('branch212().alice'),2);assert.equal(run('beforeAlice212-s.balance'),8000);
const snap=run('wbCloudSnapshot()');assert(Object.keys(snap).length<=10);assert(JSON.parse(snap['wbpvz-demo-v18']).work212);
assert(run(`bonuses212Page().includes('История наград')`));assert(run(`calendar212Page().includes('Пн')`));
console.log('PASS v2.12: 1–14-day arrivals (10000 goods), tape, all penalty routes, XP, activation idempotency, daily rewards, atomic auto supplies, unique partner prizes, 1M wheel classification, offline boost clock, 300-notification cap, Alice upgrade credit, ten-key cloud envelope, rewards/calendar rendering');
// Failed storage writes must roll back both currency and reward inventory.
run(`company212().active.income=null;company212().inventory.income=2;const storageWriter212=localStorage.setItem;const rollbackCash212=s.balance;localStorage.setItem=(k,v)=>{if(k===TY173_KEY)throw Object.assign(new Error('fixture quota'),{name:'QuotaExceededError'});return storageWriter212(k,v)};activate212('income');localStorage.setItem=storageWriter212`);
assert.equal(run('company212().inventory.income'),2);assert.equal(run('company212().active.income'),null);assert.equal(run('s.balance'),run('rollbackCash212'));
console.log('PASS: quota failure rolls back token, active effect and wallet');
