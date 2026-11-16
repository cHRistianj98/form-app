// Cloudflare Pages Functions. Single-user backend with Cloudflare D1.
// All /api/* endpoints require a signed HttpOnly session cookie, except session/login.
import {normalizeProfile, ACTIVITY_LEVELS} from '../../src/profile.js';
import {calcTargets} from '../../src/foods.js';
import {NUTRIENT_FIELDS,MACRO_FIELDS} from '../../src/nutrients.js';
import {validSupplementPlan} from '../../src/supplementPlan.js';

const json = (value, status = 200, headers = {}) => new Response(JSON.stringify(value), {
  status, headers: { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff', ...headers }
});
const encode = (str) => btoa(String.fromCharCode(...new TextEncoder().encode(str))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
const decode = (str) => new TextDecoder().decode(Uint8Array.from(atob(str.replace(/-/g,'+').replace(/_/g,'/')), c => c.charCodeAt(0)));
const hex = bytes => [...new Uint8Array(bytes)].map(n=>n.toString(16).padStart(2,'0')).join('');
async function hmac(value,secret) {
  const key = await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  return hex(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(value)));
}
function equal(a,b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
async function token(secret) {
  const body = encode(JSON.stringify({v:1,exp:Date.now()+30*86400000}));
  return `${body}.${await hmac(body,secret)}`;
}
async function auth(req,env) {
  const cookie = req.headers.get('Cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith('forma_session='))?.slice(14);
  if (!cookie || !env.SESSION_SECRET) return false;
  const [body,sig,extra] = cookie.split('.');
  if (!body || !sig || extra) return false;
  const expected = await hmac(body,env.SESSION_SECRET);
  if (!equal(sig,expected)) return false;
  try { const data = JSON.parse(decode(body)); return data.v === 1 && typeof data.exp === 'number' && data.exp > Date.now(); }
  catch { return false; }
}
const validDay = d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d));
const finite = (n,min,max) => typeof n === 'number' && Number.isFinite(n) && n>=min && n<=max;
const validId = s => typeof s === 'string' && s.length>0 && s.length<=100 && /^[\w:-]+$/.test(s);
const nutrients = NUTRIENT_FIELDS;
function validFood(food) {
  if (!food || !validId(food.id) || typeof food.name !== 'string' || !food.name.trim() || food.name.length>180) return false;
  if (food.brand != null && (typeof food.brand !== 'string' || food.brand.length>120)) return false;
  if (food.unit != null && !['g','ml','tablet','capsule'].includes(food.unit)) return false;
  if (food.kind != null && food.kind!=='supplement') return false;
  if (food.unit==='capsule'&&food.kind!=='supplement') return false;
  if (food.kind==='supplement'&&!['capsule','tablet'].includes(food.unit)) return false;
  if (food.basisQuantity != null && food.basisQuantity !== (['tablet','capsule'].includes(food.unit)?1:100)) return false;
  for(const [field,limit] of [['ingredients',1800],['labelNote',1000],['sourceUrl',500],['verifiedAt',10]]) if(food[field]!=null&&(typeof food[field]!=='string'||food[field].length>limit)) return false;
  if(food.sourceUrl&&!/^https:\/\//.test(food.sourceUrl)) return false;
  if(typeof food.image==='string'&&food.image.startsWith('data:')&&!(food.image.length<=160000&&/^data:image\/webp;base64,[A-Za-z0-9+/]+=*$/.test(food.image))) return false;
  if (food.aliases != null && (!Array.isArray(food.aliases)||food.aliases.length>12||!food.aliases.every(s=>typeof s==='string'&&s.length<=100))) return false;
  if (food.servingSizes != null && (!Array.isArray(food.servingSizes)||food.servingSizes.length>12||!food.servingSizes.every(s=>s&&typeof s.label==='string'&&s.label.length<=100&&finite(s.quantity,0.1,100000)&&(!['tablet','capsule'].includes(food.unit)||Number.isInteger(s.quantity))))) return false;
  if (food.fatLessThan != null && typeof food.fatLessThan !== 'boolean') return false;
  for(const field of ['partialNutrients','upperBoundNutrients']) {
    if(food[field]!=null&&(!Array.isArray(food[field])||food[field].length>nutrients.length||new Set(food[field]).size!==food[field].length||!food[field].every(key=>nutrients.includes(key)&&finite(food[key],0,100000)))) return false;
  }
  if(food.upperBoundNutrients?.some(key=>food[key]<=0)) return false;
  if(food.estimateNotes!=null&&(typeof food.estimateNotes!=='string'||food.estimateNotes.length>1800)) return false;
  if (food.imageFit != null && !['contain','cover'].includes(food.imageFit)) return false;
  if (food.imageNote != null && (typeof food.imageNote !== 'string' || food.imageNote.length>240)) return false;
  for (const k of nutrients) if (food[k] != null && !finite(food[k],0,100000)) return false;
  return MACRO_FIELDS.every(k=>food[k]===null||finite(food[k],0,100000));
}
function cleanFood(food) {
  const result = {id:food.id,name:food.name.trim(),brand:(food.brand||'').trim(),source: String(food.source||'Własny').slice(0,50)};
  for (const k of nutrients) if (food[k] !== undefined) result[k] = food[k];
  if (food.unit != null) result.unit = food.unit;
  for(const field of ['kind','ingredients','labelNote','sourceUrl','verifiedAt']) if(food[field]!=null) result[field]=food[field];
  if (food.basisQuantity != null) result.basisQuantity = food.basisQuantity;
  if (food.aliases != null) result.aliases = food.aliases;
  if (food.servingSizes != null) result.servingSizes = food.servingSizes.map(({label,quantity})=>({label,quantity}));
  if (food.fatLessThan != null) result.fatLessThan = food.fatLessThan;
  if (food.partialNutrients != null) result.partialNutrients = [...food.partialNutrients];
  if (food.upperBoundNutrients != null) result.upperBoundNutrients = [...food.upperBoundNutrients];
  if (food.estimateNotes != null) result.estimateNotes = food.estimateNotes;
  if (food.imageFit != null) result.imageFit = food.imageFit;
  if (food.imageNote != null) result.imageNote = food.imageNote;
  if (typeof food.image === 'string' && (/^\/foods\/[a-z][a-z0-9-]*\.webp$/.test(food.image) || /^https:\/\/images\.openfoodfacts\.org\/[\w/.-]+$/.test(food.image))) result.image = food.image;
  if (typeof food.image==='string' && food.image.length<=160000 && /^data:image\/webp;base64,[A-Za-z0-9+/]+=*$/.test(food.image)) result.image=food.image;
  return result;
}
async function readBody(req) {
  const length = Number(req.headers.get('content-length') || 0);
  if (length > 250000) throw new Error('Dane są za duże');
  const text = await req.text();
  if (text.length > 250000) throw new Error('Dane są za duże');
  try { return JSON.parse(text); }
  catch { throw new Error('Niepoprawny JSON'); }
}
async function state(db) {
  const [er,ar,dr,fr,pr] = await Promise.all([
    db.prepare('SELECT id, day, meal, grams, food_json FROM entries ORDER BY day DESC, created_at DESC').all(),
    db.prepare('SELECT id, day, type, minutes, distance, kcal, included_in_steps FROM activities ORDER BY day DESC, created_at DESC').all(),
    db.prepare('SELECT day, steps, weight, notes FROM daily_metrics ORDER BY day DESC').all(),
    db.prepare('SELECT id, food_json FROM foods ORDER BY created_at DESC').all(),
    db.prepare("SELECT value_json FROM settings WHERE key='profile'").first()
  ]);
  return {
    entries:er.results.map(({food_json,...x})=>({...x,food:JSON.parse(food_json)})),
    activities:ar.results.map(({included_in_steps,...x})=>({...x,includedInSteps:!!included_in_steps})),
    daily:dr.results,
    foods:fr.results.map(r=>JSON.parse(r.food_json)),
    profile:normalizeProfile(pr ? JSON.parse(pr.value_json) : null),
  };
}
function mappedProduct(p) {
  const n = p.nutriments || {};
  const num = k => n[k] == null || !Number.isFinite(Number(n[k])) ? null : Math.max(0,Number(n[k]));
  let kcal = num('energy-kcal_100g');
  if (kcal == null && num('energy_100g') != null) kcal = num('energy_100g') / 4.184;
  const food = {
    id:`off:${String(p.code||'')}`, name:(p.product_name_pl || p.product_name || '').trim(),
    brand:(p.brands||'').slice(0,100), source:'Open Food Facts', image:p.image_front_small_url || null,
    kcal,protein:num('proteins_100g'),carbs:num('carbohydrates_100g'),fat:num('fat_100g'),
    fiber:num('fiber_100g'),sugars:num('sugars_100g'),saturatedFat:num('saturated-fat_100g'),
    salt:num('salt_100g'),calcium: num('calcium_100g') == null ? null : num('calcium_100g')*1000,
    iron:num('iron_100g') == null ? null : num('iron_100g')*1000,
    potassium:num('potassium_100g') == null ? null : num('potassium_100g')*1000,
    magnesium:num('magnesium_100g') == null ? null : num('magnesium_100g')*1000,
    vitaminC:num('vitamin-c_100g') == null ? null : num('vitamin-c_100g')*1000,
    vitaminD:num('vitamin-d_100g') == null ? null : num('vitamin-d_100g')*1e6,
    b12:num('vitamin-b12_100g') == null ? null : num('vitamin-b12_100g')*1e6,
  };
  return food;
}
async function searchFood(term) {
  const fields = 'code,product_name,product_name_pl,brands,nutriments,image_front_small_url';
  const qs = new URLSearchParams({search_terms:term,search_simple:'1',action:'process',json:'1',page_size:'18',fields});
  const controller = new AbortController();
  const timeout = setTimeout(()=>controller.abort(),8000);
  try {
    const r = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?${qs}`, {
      headers:{'User-Agent':'FormaNutri/1.0 (personal nutrition tracker; https://github.com/openfoodfacts/openfoodfacts-server)','Accept':'application/json'},
      signal:controller.signal,
    });
    if (!r.ok) return {products:[],unavailable:true};
    const data = await r.json();
    const products = (data.products||[]).map(mappedProduct).filter(f=>/^off:\d{8,14}$/.test(f.id)&&f.name&&validFood(f));
    return {products:products.slice(0,18),unavailable:false};
  } finally {clearTimeout(timeout);}
}
export async function onRequest(context) {
  const {request:req,env} = context;
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api\/?/,'').split('/').filter(Boolean).map(decodeURIComponent);
  const method = req.method.toUpperCase();
  if (!['GET','POST','DELETE'].includes(method)) return json({error:'Metoda niedozwolona'},405);
  if (method!=='GET' && req.headers.get('Origin') && req.headers.get('Origin') !== url.origin) return json({error:'Niedozwolone pochodzenie'},403);
  if (!env.APP_PASSWORD || !env.SESSION_SECRET || env.SESSION_SECRET.length<20 || !env.DB) {
    return json({error:'Aplikacja wymaga konfiguracji APP_PASSWORD, SESSION_SECRET oraz bindingu D1 DB.'},503);
  }
  try {
    if (path[0]==='session' && method==='GET') return json({authenticated:await auth(req,env)});
    if (path[0]==='login' && method==='POST') {
      const body=await readBody(req);
      const a = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(body.password||'')));
      const b = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(env.APP_PASSWORD));
      if (!equal(hex(a),hex(b))) return json({error:'Nieprawidłowe hasło'},401);
      return json({ok:true},200,{'Set-Cookie':`forma_session=${await token(env.SESSION_SECRET)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`});
    }
    if (path[0]==='logout' && method==='POST') return json({ok:true},200,{'Set-Cookie':'forma_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0'});
    if (!(await auth(req,env))) return json({error:'Wymagane logowanie'},401);
    if (path[0]==='state' && method==='GET') return json(await state(env.DB));
    if (path[0]==='search' && method==='GET') {
      const q=(url.searchParams.get('q')||'').trim().slice(0,80);
      if (q.length<3) return json({products:[]});
      try { return json(await searchFood(q)); }
      catch {return json({products:[],unavailable:true});}
    }
    if (path[0]==='entries' && method==='POST') {
      const b=await readBody(req);
      if (!validId(b.id)||!validDay(b.day)||!['breakfast','lunch','dinner','snack','supplements'].includes(b.meal)||!finite(b.grams,0.1,100000)||!validFood(b.food)) return json({error:'Niepoprawny wpis jedzenia'},400);
      if (b.meal==='supplements'&&b.food.kind!=='supplement') return json({error:'W tym panelu zapisuj suplementy'},400);
      if (b.meal==='supplements'&&b.id!==`intake:${b.day}:${b.food.id}`) return json({error:'Niepoprawny identyfikator zapisu suplementu'},400);
      if (b.food.kind==='supplement'&&b.meal!=='supplements') return json({error:'Suplement zapisz w panelu suplementów'},400);
      if (['tablet','capsule'].includes(b.food.unit)&&!Number.isInteger(b.grams)) return json({error:'Podaj całkowitą liczbę tabletek lub kapsułek'},400);
      await env.DB.prepare('INSERT INTO entries (id,day,meal,grams,food_json) VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET day=excluded.day,meal=excluded.meal,grams=excluded.grams,food_json=excluded.food_json')
        .bind(b.id,b.day,b.meal,b.grams,JSON.stringify(cleanFood(b.food))).run();
      return json({ok:true});
    }
    if (path[0]==='entries' && path[1] && method==='DELETE') {
      await env.DB.prepare('DELETE FROM entries WHERE id=?').bind(path[1]).run();return json({ok:true});
    }
    if (path[0]==='activities' && method==='POST') {
      const b=await readBody(req);
      if (!validId(b.id)||!validDay(b.day)||!['strength','run','walk','bike','other'].includes(b.type)||!finite(b.minutes,0,1440)||!finite(b.distance,0,500)||!finite(b.kcal,0,10000)||typeof b.includedInSteps!=='boolean') return json({error:'Niepoprawny trening'},400);
      await env.DB.prepare('INSERT INTO activities (id,day,type,minutes,distance,kcal,included_in_steps) VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET day=excluded.day,type=excluded.type,minutes=excluded.minutes,distance=excluded.distance,kcal=excluded.kcal,included_in_steps=excluded.included_in_steps')
        .bind(b.id,b.day,b.type,b.minutes,b.distance,b.kcal,b.includedInSteps?1:0).run();return json({ok:true});
    }
    if (path[0]==='activities' && path[1] && method==='DELETE') {
      await env.DB.prepare('DELETE FROM activities WHERE id=?').bind(path[1]).run();return json({ok:true});
    }
    if (path[0]==='daily' && method==='POST') {
      const b=await readBody(req);
      if (!validDay(b.day)||!Number.isInteger(b.steps)||b.steps<0||b.steps>200000|| (b.weight!=null && !finite(b.weight,20,500))|| typeof b.notes!=='string'||b.notes.length>1000) return json({error:'Niepoprawne dane dzienne'},400);
      await env.DB.prepare('INSERT INTO daily_metrics (day,steps,weight,notes) VALUES (?,?,?,?) ON CONFLICT(day) DO UPDATE SET steps=excluded.steps,weight=excluded.weight,notes=excluded.notes')
        .bind(b.day,b.steps,b.weight,b.notes).run();return json({ok:true});
    }
    if (path[0]==='foods' && method==='POST') {
      const b=await readBody(req);
      if (!validFood(b)||!b.id.startsWith('own:')) return json({error:'Niepoprawny produkt'},400);
      await env.DB.prepare('INSERT INTO foods (id,food_json) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET food_json=excluded.food_json').bind(b.id,JSON.stringify(cleanFood(b))).run();return json({ok:true});
    }
    if (path[0]==='foods' && path[1] && method==='DELETE') {
      if (!path[1].startsWith('own:')) return json({error:'Niepoprawny identyfikator'},400);
      await env.DB.prepare('DELETE FROM foods WHERE id=?').bind(path[1]).run();return json({ok:true});
    }
    if (path[0]==='profile' && method==='POST') {
      const b=await readBody(req);
      if(b.supplementPlan!==undefined&&!validSupplementPlan(b.supplementPlan))return json({error:'Niepoprawny plan suplementów'},400);
      if (!finite(b.height,100,250)||!Number.isInteger(b.age)||b.age<15||b.age>110||!['male','female'].includes(b.sex)||!finite(b.startWeight,20,500)||!finite(b.targetWeight,20,500)||!finite(b.deficit,0,1300)||!finite(b.proteinFactor,0.5,3.5)||!finite(b.fatFactor,0.3,2)||!finite(b.manualCalories,0,6000)) return json({error:'Niepoprawny profil'},400);
      const p=normalizeProfile(b);
      if (p.nutritionVersion!==2 || !['mifflin','eer2023'].includes(p.energyMethod) || !ACTIVITY_LEVELS.some(a=>a.id===p.activityLevel) || !['percent','kcal'].includes(p.deficitMode) || !finite(p.deficitPercent,0,25) || !finite(p.manualProtein,0,400) || (p.energyMethod==='eer2023' && p.age<19)) return json({error:'Niepoprawne ustawienia wyliczania kalorii'},400);
      const weights=await env.DB.prepare('SELECT weight FROM daily_metrics WHERE weight IS NOT NULL ORDER BY day DESC LIMIT 1').first();
      const targets=calcTargets(p,weights?.weight || p.startWeight);
      if (targets.calories<=0 || !targets.macrosFit) return json({error:'Cel kalorii musi pokrywać wybrane białko i tłuszcze. Zwiększ kalorie lub zmień makro.'},400);
      const fields=['nutritionVersion','height','age','sex','startWeight','targetWeight','deficit','proteinFactor','fatFactor','manualCalories','energyMethod','activityLevel','deficitMode','deficitPercent','manualProtein','supplementPlan'];
      await env.DB.prepare("INSERT INTO settings (key,value_json) VALUES ('profile',?) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json")
        .bind(JSON.stringify(Object.fromEntries(fields.map(k=>[k,p[k]])))).run();return json({ok:true});
    }
    return json({error:'Nieznany adres API'},404);
  } catch(e) {
    const msg = e instanceof Error ? e.message : 'Błąd serwera';
    // Nie ujawniamy szczegółów błędów bazy danych ani sekretów.
    if (/Dane są za duże|Niepoprawny JSON/.test(msg)) return json({error:msg},400);
    console.error('Forma API error',e);
    return json({error:'Błąd serwera. Sprawdź konfigurację bazy danych.'},500);
  }
}
