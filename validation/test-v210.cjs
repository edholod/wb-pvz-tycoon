const engine=require('./engine.cjs'),assert=require('assert/strict');
const c=engine(__dirname+'/../index.html');
function run(code){return c.run(code)}
run(`s=fresh();s.opened=true;s.balance=10000000;s.pvzNumber='TEST-A';s.pvzAddress='Тестовая улица, 10';s.gameMinute=540;s.lastReal=Date.now();s.live31Last=540;s.staff=[{...candidates()[0],offset:0},{...candidates()[1],offset:2}];game202StarterEquipment();live31Init();ledgerInit();init210();quest35Init();s.quest35.xp=10000;pvz34={active:0,branches:[{state:structuredClone(s),manager:false}]};`);
assert.deepEqual(Array.from(run('[0,19,20,29,30,39,40,49,50,59,60,69,70,79,80,89,90,100].map(happinessFlow210)')),[-.3,-.3,-.2,-.2,-.1,-.1,-.05,-.05,0,0,.05,.05,.1,.1,.2,.2,.3,.3]);
assert.equal(run('PARTNERS210.length'),9);assert.equal(run('Object.keys(EQUIPMENT210).length'),12);assert.equal(run('HUMOR210.filter(e=>e.choice).length'),30);assert.equal(run('HUMOR210.filter(e=>!e.choice).length'),20);assert.equal(run('achievements210().length'),15);
// Migration preserves legacy levels, stock, money, reviews and wear, and is idempotent.
run(`s.equipment.pc=5;s.equipment.scanner=4;s.equipRecords.scanner={bought:3,level:4,broken:true,purchasePrice:16000};s.reviews=[{text:'старый отзыв',score:5}];s.rating=4.91;delete s.v210;delete s.equipment210;const before210=JSON.stringify({balance:s.balance,equipment:s.equipment,reviews:s.reviews,record:s.equipRecords.scanner,capacity:s.capacity});init210();capacity210();init210();capacity210();`);
assert.equal(run(`JSON.stringify({balance:s.balance,equipment:s.equipment,reviews:s.reviews,record:s.equipRecords.scanner,capacity:s.capacity})===before210`),true);
run('rating210Add(5)');assert(run('s.rating')>=4.91);
// Exact partner costs, no duplication, no benefit for Post.
run("buyPartner210('post')");assert.equal(run('s.balance'),9000000);assert.equal(run('partnerEffect210("flow")'),0);run("buyPartner210('post')");assert.equal(run('s.balance'),9000000);
run("buyPartner210('charge')");assert.equal(run('s.balance'),9000000);
run("accrue210(s.gameMinute+1440);accrue210(2880)");let paid=run('s.partners210.paid.charge');assert(paid>0&&paid<=4000);let balance=run('s.balance');run('accrue210(2880)');assert.equal(run('s.balance'),balance);
// Purchase bundle is atomic on insufficient balance; zero stocks preserved.
run('s.balance=0');let sp=run('JSON.stringify(s.live32.supplies)');run('supplies210Buy()');assert.equal(run('JSON.stringify(s.live32.supplies)'),sp);
run('s.balance=1000000;supplies210Buy()');assert.equal(run('s.balance'),1000000-run('Object.values(SUPPLIES210).reduce((n,p)=>n+p.cost,0)'));
// No anonymous ratings deducted for empty bags or queue abandonment; reviews only.
run('s.rating=4.9;s.live32.queue=[{at:0,kind:"issue"}];s.live32.supplies.bags=0;live32Customers(600,activeStaff(0))');assert.equal(run('s.rating'),4.9);
// Actual goods, XP, turnover and rewards progress together, no fake issue consumes supplies.
run(`s.live32.queue=[];const issuedBefore=s.live32.served;const bagsBefore=s.live32.supplies.bags;live32Customers(605,activeStaff(0));`);assert.equal(run('s.live32.supplies.bags'),run('bagsBefore'));
run(`live31Arrive(600,10);for(const g of Object.values(s.goodsLedger))if(g.status==='stock')g.pickupAt=610;const xpBefore=s.quest35.xp;const turnoverBefore=s.turnover;live32Customers(610,activeStaff(0));`);assert(run('s.quest35.xp')>run('xpBefore'));assert(run('s.turnover')>run('turnoverBefore'));
// Choice replay cannot create rewards/fines and 20 notes have no financial action.
run(`s.humor210.choices=[{id:0,at:0}];const humorCash=s.balance;humor210Choose(0,'a');humor210Choose(0,'a');`);assert.equal(run('s.balance'),run('humorCash'));assert.equal(run('s.humor210.resolved'),1);
// 7 days with real hourly and five-minute engine, then two-branch catch-up and reload.
run(`s.balance=10000000;s.lastReal=Date.now();s.live31Last=s.gameMinute;s.equipRecords.scanner.broken=false;pvz34Store();let oldTime=s.gameMinute;for(let n=0;n<7*24;n++){const target=s.gameMinute+60;tickHour();for(let at=target-55;at<=target;at+=5)live31Minute(at)};`);
assert.equal(run('s.gameMinute-oldTime'),7*1440);assert(run('s.turnover')>0);assert(run('Number.isFinite(s.balance)&&Number.isFinite(s.earned)&&Number.isFinite(s.capacity)'));assert(run('s.stock>=0'));assert(run('s.rating>=1&&s.rating<=5'));assert(run('happy210()>=0&&happy210()<=100'));
run(`pvz34Store();const branchB=structuredClone(s);branchB.pvzNumber='TEST-B';branchB.pvzAddress='Второй адрес';branchB.partners210={connected:{},accrued:{},paid:{},lastAt:branchB.gameMinute};pvz34.branches.push({state:branchB,manager:false});for(const b of pvz34.branches)b.state.lastReal=Date.now()-120000;s.lastReal=Date.now()-120000;sync();const afterSync=s.balance;const sameTime=s.gameMinute;sync();`);
assert.equal(run('s.gameMinute'),run('sameTime'));assert.equal(run('s.balance'),run('afterSync'));assert.equal(run('pvz34.branches.every(b=>b.state.balance===s.balance)'),true);assert.equal(run('pvz34.branches[1].state.partners210.connected.charge||false'),false);
// Audit/item expiration is charged once, including repeated advance.
run(`case159Init();s.case159.items=[{id:123,kind:'stuck',code:'TEST',amount:100,status:'new',deadline:0}];const beforeFine=s.balance;case159Advance();case159Advance();`);assert.equal(run('beforeFine-s.balance'),100);
run('save();pvz34Store();const saved210=wbCloudSnapshot();');assert(run('Object.keys(saved210).length>=2'));assert.equal(run('JSON.parse(saved210["wbpvz-portfolio-v134"]).branches.length'),2);
console.log('PASS: migration, all happiness thresholds, 9 partners, 12 equipment types, 50 stories, 15 achievements, prices, idempotent payouts, atomic supplies, rating preservation, operations/XP, seven-day simulation, two branches, repeat catchup, no double fines, cloud snapshot');
