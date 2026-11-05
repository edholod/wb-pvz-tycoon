
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function reply(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function hex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function verifyTelegram(initData: string) {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const tokenInfo = token?.match(/^(\d+):(.+)$/);

console.log("Bot token diagnostics", {
  validFormat: Boolean(tokenInfo),
  botId: tokenInfo?.[1] ?? null,
  tokenHasWhitespace: token !== token?.trim(),
});
  if (!token || !initData) return null;

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  const authDate = Number(params.get("auth_date"));

  if (!hash || !Number.isFinite(authDate)) return null;

  const age = Math.floor(Date.now() / 1000) - authDate;
  if (age < -60 || age > 86400) return null;

  const checkString = [...params.entries()]
    .filter(([key]) => key !== "hash")
.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const enc = new TextEncoder();

  const secretKey = await crypto.subtle.importKey(
    "raw",
    enc.encode("WebAppData"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const secret = await crypto.subtle.sign(
    "HMAC",
    secretKey,
    enc.encode(token),
  );

  const dataKey = await crypto.subtle.importKey(
    "raw",
    secret,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const calculated = hex(
    await crypto.subtle.sign(
      "HMAC",
      dataKey,
      enc.encode(checkString),
    ),
  );

  if (!/^[0-9a-f]{64}$/i.test(hash)) return null;

  let difference = 0;
  for (let i = 0; i < 64; i++) {
    difference |= calculated.charCodeAt(i) ^
      hash.toLowerCase().charCodeAt(i);
  }
if (difference !== 0) {
  console.warn("Telegram signature mismatch", {
    tokenHasWhitespace: token !== token.trim(),
    hasUser: params.has("user"),
    receivedFields: [...params.keys()].sort(),
  });
  return null;
}

console.log("Telegram signature verified");
  try {
    const user = JSON.parse(params.get("user") || "null");
    if (!user || !Number.isSafeInteger(user.id) || user.id <= 0) {
      return null;
    }
    return user;
  } catch {
    return null;
  }
}


function validCloudPayload(value: unknown): boolean {
 if (!value || typeof value !== "object" || Array.isArray(value)) return false;
 const keys = ["wbpvz-demo-v18","wbpvz-portfolio-v134","wbpvz-daily-login-v138","wbpvz-time-boost-v141","wbpvz-collections-v145","wbpvz-profile-v146","wbpvz-privacy-v147","wbpvz-boost-earnings-v166","wbpvz-level-rewards-v167","wbpvz-bonuses-v173"];
 const data = value as Record<string,string>;
 const names = Object.keys(data);
 if (!names.includes("wbpvz-demo-v18") || names.length > keys.length || JSON.stringify(data).length > 4000000) return false;
 try {
  for (const key of names) {
   if (!keys.includes(key) || typeof data[key] !== "string") return false;
   const parsed = JSON.parse(data[key]);
   if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return false;
  }
  const main = JSON.parse(data["wbpvz-demo-v18"]);
  if (!Number.isFinite(main.balance) || !Number.isFinite(main.gameMinute) || main.gameMinute < 0) return false;
  if (data["wbpvz-portfolio-v134"]) {
   const network = JSON.parse(data["wbpvz-portfolio-v134"]);
   if (!Array.isArray(network.branches) || !network.branches.length || network.branches.length > 12 || !Number.isInteger(network.active) || !network.branches[network.active]?.state) return false;
   for (const branch of network.branches) {
    if (!branch?.state || !Number.isFinite(branch.state.balance) || !Number.isFinite(branch.state.gameMinute)) return false;
   }
  }
  return true;
 } catch { return false; }
}


// v1.97: publish only accepted saves. Provisional: client simulation is not anti-cheat verified.
function rankingFromSave(payload: Record<string,string>, user: any) {
 try {
  const main=JSON.parse(payload["wbpvz-demo-v18"]);
  const network=payload["wbpvz-portfolio-v134"]?JSON.parse(payload["wbpvz-portfolio-v134"]):null;
  const privacy=payload["wbpvz-privacy-v147"]?JSON.parse(payload["wbpvz-privacy-v147"]):{};
  const states=Array.isArray(network?.branches)?network.branches.map((b:any)=>b.state):[main];
  const xp=Math.max(0,Number(main?.quest35?.xp)||0,...states.map((v:any)=>Number(v?.quest35?.xp)||0));
  if(!Number.isFinite(xp)||xp>1e12)return null;
  let level=1; while(level<1000000){const n=level;if(250*n+25*n*(n-1)/2>xp)break;level++;}
  const name=[user.first_name,user.last_name].filter((v:any)=>typeof v==='string').join(' ').trim();
  return {telegram_id:user.id,display_name:privacy.name===false?'Игрок':(name||user.username||'Игрок').slice(0,80),
   score:Math.floor(xp),pvz_count:privacy.branches===false?null:states.filter((v:any)=>v?.opened).length,
   player_level:level,is_public:privacy.xp!==false};
 } catch{return null;}
}
function rankingPeriods(now=new Date()) {
 const monday=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()));
 monday.setUTCDate(monday.getUTCDate()-((monday.getUTCDay()+6)%7));
 return [{period:'all',period_start:'1970-01-01'}, {period:'week',period_start:monday.toISOString().slice(0,10)},
 {period:'month',period_start:now.toISOString().slice(0,7)+'-01'}];
}
async function publishRanking(db:any,payload:Record<string,string>,user:any,revision:number) {
 try{
  const rank=rankingFromSave(payload,user); if(!rank)return false;
  const {error}=await db.rpc('publish_game_ranking_v197',{p_telegram_id:user.id,p_display_name:rank.display_name,
   p_score:rank.score,p_pvz_count:rank.pvz_count,p_player_level:rank.player_level,p_is_public:rank.is_public,p_revision:revision});
  if(error){console.error('Ranking publication failed',error.code);return false;}return true;
 }catch{console.error('Ranking publication failed');return false;}
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  if (req.method !== "POST") {
    return reply({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json();
    const action = body?.action;

    if (!["leaderboard", "me", "cloud_load", "cloud_claim", "cloud_save", "profiles_search", "public_profile"].includes(action)) {
      return reply({ error: "Unknown action" }, 400);
    }


const user = await verifyTelegram(body?.initData);

if (!user) {
  const params = new URLSearchParams(
    typeof body?.initData === "string" ? body.initData : ""
  );

  const authDate = Number(params.get("auth_date"));
  const age = authDate
    ? Math.floor(Date.now() / 1000) - authDate
    : null;

  console.warn("Telegram auth rejected", {
    initDataPresent: Boolean(body?.initData),
    hasHash: params.has("hash"),
    hasAuthDate: params.has("auth_date"),
    authAgeSeconds: age,
    botTokenConfigured: Boolean(Deno.env.get("TELEGRAM_BOT_TOKEN")),
  });

  return reply({ error: "Telegram authorization required" }, 401);
}

    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!url || !serviceKey) {
      return reply({ error: "Server configuration missing" }, 500);
    }

    const db = createClient(url, serviceKey, {
      auth: { persistSession: false },
    });

    

    if(action==='profiles_search'||action==='public_profile') {
      const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if(action==='public_profile'&&!uuid.test(body.publicId||''))return reply({error:'Invalid profile'},400);
      if(body.after&&!uuid.test(body.after))return reply({error:'Invalid cursor'},400);
      const query=typeof body.query==='string'?body.query.trim().slice(0,70):'';
      if(action==='profiles_search'&&query.replace(/^@/,'').length<2)return reply({error:'Enter at least two characters'},400);
      const {data,error}=await db.rpc('public_profiles_v212',{p_query:query,p_public_id:action==='public_profile'?body.publicId:null,p_after:body.after||null});
      if(error)return reply({error:'Profiles unavailable'},503);
      const rows=Array.isArray(data)?data:[];
      const safeRows=rows.map((x:any)=>{const {public_id,display_name,username,photo_url,xp,player_level,balance,pvz_count,rating,happiness,achievements}=x;return {public_id,display_name,username,photo_url,xp,player_level,balance,pvz_count,rating,happiness,achievements}});
      return action==='public_profile'?reply({profile:safeRows[0]||null,private:!safeRows.length}):reply({profiles:safeRows.slice(0,20),next:rows.length>20?rows[19].public_id:null});
    }

    if (action === "cloud_load" || action === "cloud_claim" || action === "cloud_save") {
      const table = db.from("game_cloud_saves");
      if (action === "cloud_load") {
        const { data, error } = await table.select("revision,writer_id,payload,updated_at").eq("telegram_id", user.id).maybeSingle();
        if (error) return reply({ error: "Cloud unavailable" }, 503);
        if(data&&Number(body.clientVersion||0)<212){const main=JSON.parse(data.payload["wbpvz-demo-v18"]||'{}');const network=JSON.parse(data.payload["wbpvz-portfolio-v134"]||'{}');if(main.goodsLedger?.__wbLedger212||network.branches?.some((b:any)=>b.state?.goodsLedger?.__wbLedger212))return reply({error:'Обновите игру: закройте Mini App и откройте заново. Прогресс сохранён.'},426)}
        return reply({ save: data });
      }
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.writerId || "") || !Number.isSafeInteger(body.revision) || body.revision < 0) return reply({ error: "Invalid cloud request" }, 400);
      if (action === "cloud_claim") {
        const { data, error } = await table.update({ writer_id: body.writerId }).eq("telegram_id", user.id).eq("revision", body.revision).select("revision,updated_at").maybeSingle();
        if (error) return reply({ error: "Cloud unavailable" }, 503);
        if (!data) return reply({ error: "Cloud conflict" }, 409);
        return reply({ save: data });
      }
      if (!validCloudPayload(body.payload)) return reply({ error: "Invalid save data" }, 400);
      if (body.revision === 0) {
        // Protect the owner's existing phone progress during the first migration.
        if (user.id === 456956528) {
          const main = JSON.parse(body.payload["wbpvz-demo-v18"]);
          const network = body.payload["wbpvz-portfolio-v134"] ? JSON.parse(body.payload["wbpvz-portfolio-v134"]) : null;
          if (!main.opened && !network?.branches?.some((b: any) => b.state?.opened)) return reply({ error: "Open the original phone save first" }, 409);
        }
        const { data, error } = await table.insert({ telegram_id: user.id, revision: 1, writer_id: body.writerId, payload: body.payload }).select("revision,updated_at").single();
        if (error?.code === "23505") return reply({ error: "Cloud conflict" }, 409);
        if (error) return reply({ error: "Cloud unavailable" }, 503);
        await db.from('game_profile_ids_v212').upsert({telegram_id:user.id,verified_username:typeof user.username==='string'?user.username:null,verified_photo:typeof user.photo_url==='string'&&user.photo_url.startsWith('https://')?user.photo_url:null},{onConflict:'telegram_id'});
        const rankingPublished=await publishRanking(db,body.payload,user,data.revision);
        return reply({save:data,ranking_published:rankingPublished});
      }
      const { data: current, error: readError } = await table.select("revision,writer_id,payload").eq("telegram_id", user.id).maybeSingle();
      if (readError) return reply({ error: "Cloud unavailable" }, 503);
      if (!current || current.revision !== body.revision || current.writer_id !== body.writerId) return reply({ error: "Cloud conflict" }, 409);
      const { data, error } = await table.update({ revision: body.revision + 1, payload: body.payload, previous_payload: current.payload, updated_at: new Date().toISOString() }).eq("telegram_id", user.id).eq("revision", body.revision).eq("writer_id", body.writerId).select("revision,updated_at").maybeSingle();
      if (error) return reply({ error: "Cloud unavailable" }, 503);
      if (!data) return reply({ error: "Cloud conflict" }, 409);
      await db.from('game_profile_ids_v212').upsert({telegram_id:user.id,verified_username:typeof user.username==='string'?user.username:null,verified_photo:typeof user.photo_url==='string'&&user.photo_url.startsWith('https://')?user.photo_url:null},{onConflict:'telegram_id'});
        const rankingPublished=await publishRanking(db,body.payload,user,data.revision);
      return reply({save:data,ranking_published:rankingPublished});
    }

if(action==='leaderboard') {
 const period=['week','month','all'].includes(body.period)?body.period:'all';
 const periodStart=rankingPeriods().find(p=>p.period===period)!.period_start;
 // Existing saves appear too: opening the leaderboard republishes the accepted server snapshot.
 const {data:cloud,error:cloudError}=await db.from('game_cloud_saves').select('payload,revision').eq('telegram_id',user.id).maybeSingle();
 if(cloudError)return reply({error:'Cloud unavailable'},503);
 if(cloud&&!await publishRanking(db,cloud.payload,user,cloud.revision))return reply({error:'Ranking publication unavailable'},503);
 const base=()=>db.from('game_rankings_v196').select('telegram_id,display_name,score,pvz_count,player_level,is_public,updated_at').eq('period',period).eq('period_start',periodStart);
 const {data:rows,error}=await base().eq('is_public',true).order('score',{ascending:false}).order('telegram_id',{ascending:true}).limit(100);
 if(error)return reply({error:'Leaderboard unavailable'},503);
 const {data:mine,error:myError}=await base().eq('telegram_id',user.id).maybeSingle();
 if(myError)return reply({error:'Personal rank unavailable'},503);
 let myRank=null;
 if(mine?.is_public){
  const {count,error:countError}=await db.from('game_rankings_v196').select('telegram_id',{count:'exact',head:true}).eq('period',period).eq('period_start',periodStart).eq('is_public',true).gt('score',mine.score);
  if(countError)return reply({error:'Personal rank unavailable'},503);
  myRank={place:(count||0)+1,score:mine.score,pvz_count:mine.pvz_count,player_level:mine.player_level};
 }
 const {data:profileIds,error:idsError}=await db.from('game_profile_ids_v212').select('telegram_id,public_id').in('telegram_id',(rows||[]).map((r:any)=>r.telegram_id));
 if(idsError)return reply({error:'Profiles unavailable'},503);
 const publicIds=new Map((profileIds||[]).map((r:any)=>[r.telegram_id,r.public_id]));
 let place=0,previous=-1;
 const board=(rows||[]).map((r:any,i:number)=>{if(r.score!==previous)place=i+1;previous=r.score;
  return {place,public_id:publicIds.get(r.telegram_id)||null,display_name:r.display_name,score:r.score,pvz_count:r.pvz_count,player_level:r.player_level,is_me:r.telegram_id===user.id};});
 return reply({leaderboard:board,my_rank:myRank,hidden:!!mine&&!mine.is_public,provisional:true,period,period_start:periodStart});
}

    const { data, error } = await db
      .from("game_players")
      .select("*")
      .eq("telegram_id", user.id)
      .maybeSingle();

    if (error) {
      console.error(error);
      return reply({ error: "Profile unavailable" }, 500);
    }

    return reply({ player: data });
  } catch (error) {
    console.error(error);
    return reply({ error: "Request failed" }, 400);
  }
});
