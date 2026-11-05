const fs=require('fs'),vm=require('vm'),crypto=require('crypto');
function engine(htmlPath){
 const storage=new Map(),timers=[],logs=[];
 const element=()=>({style:{},dataset:{},classList:{contains:()=>false,add(){},remove(){},toggle(){}},children:[],querySelector:()=>null,querySelectorAll:()=>[],setAttribute(){},getAttribute(){return null},addEventListener(){},appendChild(x){return x},append(){},prepend(){},after(){},before(){},remove(){},insertAdjacentHTML(){},insertAdjacentElement(){},replaceChildren(){},getBoundingClientRect:()=>({width:390,height:844}),innerHTML:'',textContent:'',value:'',open:false});
 const elements=new Map();for(const id of ['content','tabs','notification-bell','hud179','balance152','pvz-address'])elements.set(id,element());
 const body=element();body.appendChild=()=>{};
 const document={body,documentElement:element(),hidden:false,createElement:element,getElementById:id=>elements.get(id)||null,querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}};
 const localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k),key:i=>[...storage.keys()][i],get length(){return storage.size}};
 const c={btoa:s=>Buffer.from(s,'binary').toString('base64'),atob:s=>Buffer.from(s,'base64').toString('binary'),console:{log(){},warn(...a){logs.push(a)},error(...a){logs.push(a)}},document,localStorage,Date,Math:Object.create(Math),structuredClone,crypto:crypto.webcrypto,navigator:{},location:{reload(){}},setInterval:(f,t)=>{timers.push({f,t});return timers.length},clearInterval(){},setTimeout(){},clearTimeout(){},requestAnimationFrame(){},alert(){},confirm:()=>true,addEventListener(){},scrollTo(){},innerWidth:390,innerHeight:844,URL,Blob,AbortController,TextEncoder,TextDecoder,fetch:async()=>({ok:true,json:async()=>[]})};
 c.window=c;c.globalThis=c;vm.createContext(c);
 const path=require('path');const base=path.resolve(path.dirname(htmlPath));for(const name of ['vendor/lz-string-1.5.0.min.js','vendor/fflate-0.8.2.js','modules/storage-codec.js'])if(fs.existsSync(path.join(base,name)))vm.runInContext(fs.readFileSync(path.join(base,name),'utf8'),c);
 const html=fs.readFileSync(htmlPath,'utf8');let i=0;
 for(const m of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)){
  if(!m[1].trim())continue;let src=m[1];new vm.Script(src,{filename:'inline-'+i});
  // Rendering is separately exercised in the real browser; simulation executes in isolation.
  src=src.replace(/(?<![\w.])render\(\);/g,'').replace(/\nsync\(\);/g,'\n');
  try{vm.runInContext(src,c,{filename:'inline-'+i,timeout:5000});vm.runInContext('render=function(){};',c)}catch(e){throw Error('Block '+i+': '+e.stack)}i++;
 }
 c.run=s=>vm.runInContext(s,c,{timeout:20000});c.logs=logs;c.storage=storage;return c;
}
module.exports=engine;
if(require.main===module){let c=engine(__dirname+'/../index.html');console.log('Engine boot OK',c.run('Object.keys(catalog).length'));}
