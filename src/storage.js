// In the Vite development server only, the app uses browser storage for immediate preview.
// Production never silently falls back to local storage: it requires a working D1 API.
export const DEFAULT_PROFILE = {
  height:186, startWeight:93, targetWeight:85, age:28, sex:'male',
  deficit:450, proteinFactor:1.8, fatFactor:0.8, manualCalories:0,
};
const INITIAL = {entries:[],activities:[],daily:[],foods:[],profile:DEFAULT_PROFILE};
const STORE_KEY = 'forma_demo_v1';
export function readLocal() {
  try {
    const data=JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    return data && Array.isArray(data.entries) && Array.isArray(data.daily) ? {...INITIAL,...data,profile:{...DEFAULT_PROFILE,...data.profile}} : {...INITIAL};
  } catch {return {...INITIAL};}
}
export function writeLocal(state) {localStorage.setItem(STORE_KEY,JSON.stringify(state));}
export async function api(path, options = {}) {
  const resp=await fetch('/api'+path,{credentials:'same-origin',headers:{'Content-Type':'application/json'},...options});
  let data;
  try { data=await resp.json(); }
  catch { throw new Error('Serwer nie zwrócił odpowiedzi JSON.'); }
  if (!resp.ok) {const err = new Error(data.error||`HTTP ${resp.status}`);err.status=resp.status;throw err;}
  return data;
}
export async function mutate(entity, record, method='POST', id='') {
  return api('/'+entity+(id?'/'+encodeURIComponent(id):''),{method, ...(method!=='DELETE'?{body:JSON.stringify(record)}:{})});
}
export function uuid(prefix) {
  return `${prefix}:${globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)}`;
}
