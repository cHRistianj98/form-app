import React,{useEffect,useRef,useState} from 'react';
import {Check,Clock3,ExternalLink,Info,RefreshCw,Watch} from 'lucide-react';
import {api} from './storage.js';
import {localDay,shiftDay} from './foods.js';
import './garmin-settings.css';

const dateTime=value=>value?new Date(value).toLocaleString('pl-PL',{timeZone:'Europe/Warsaw',dateStyle:'short',timeStyle:'short'}):'Jeszcze nie synchronizowano';
const checkedTime=value=>new Date(value).toLocaleTimeString('pl-PL',{timeZone:'Europe/Warsaw',hour:'2-digit',minute:'2-digit',second:'2-digit'});
const days=count=>`${count} ${count===1?'dnia':'dni'}`;
export default function GarminSettings({local,day,onSynced}) {
  const [status,setStatus]=useState(null),[busy,setBusy]=useState(false),[saving,setSaving]=useState(false);
  const [error,setError]=useState(''),[loadError,setLoadError]=useState(''),[feedback,setFeedback]=useState('');
  const [range,setRange]=useState('7'),[overwrite,setOverwrite]=useState(false),[clock,setClock]=useState(Date.now());
  const [checking,setChecking]=useState(false),[checkedAt,setCheckedAt]=useState(null);
  const syncedRef=useRef(onSynced),lastSuccess=useRef(undefined),mounted=useRef(false),statusVersion=useRef(0);
  syncedRef.current=onSynced;
  async function loadStatus() {
    const version=++statusVersion.current;
    setChecking(true);
    try {
      const next=await api('/garmin/status');if(!mounted.current||version!==statusVersion.current)return;
      setStatus(next);setClock(Date.now());setCheckedAt(Date.now());setLoadError('');
      if(lastSuccess.current!==undefined&&next.lastSuccess&&lastSuccess.current!==next.lastSuccess){setError('');await syncedRef.current?.();}
      lastSuccess.current=next.lastSuccess;
    }catch(err){if(mounted.current&&version===statusVersion.current)setLoadError(err.message);}
    finally{if(mounted.current&&version===statusVersion.current)setChecking(false);}
  }
  useEffect(()=>{
    mounted.current=true;
    if(!local)loadStatus();
    const timer=!local?setInterval(()=>{if(document.visibilityState==='visible')loadStatus();},60000):null;
    return()=>{mounted.current=false;if(timer)clearInterval(timer);};
  },[local]);
  useEffect(()=>setOverwrite(false),[day]);
  useEffect(()=>{
    if(!status?.retryAt)return;
    const timer=setTimeout(()=>setClock(Date.now()),Math.max(0,Date.parse(status.retryAt)-Date.now()+50));
    return()=>clearTimeout(timer);
  },[status?.retryAt]);
  const ready=!local&&status?.configured&&status?.schemaReady;
  const cooling=status?.retryAt&&Date.parse(status.retryAt)>clock;
  const to=day||localDay(),from=shiftDay(to,-(Number(range)-1));
  const label=local?'Podgląd lokalny':!status?(loadError?'Nie odczytano statusu':'Sprawdzam…'):!status.configured||!status.schemaReady?'Wymaga konfiguracji':status.error?'Sprawdź połączenie':status.lastSuccess?'Połączono':'Gotowe do sprawdzenia';
  async function sync() {
    setBusy(true);setError('');setFeedback('');
    try {
      const result=await api('/garmin/sync',{method:'POST',body:JSON.stringify({from,to,overwriteManual:overwrite})});
      setOverwrite(false);
      lastSuccess.current=result.at;
      setFeedback(`Zapisano kroki z ${days(result.stepsDays)}, wagę z ${days(result.weightDays)} i kalorie aktywne z ${days(result.calorieDays||0)}.${result.protectedSteps+result.protectedWeights?` Zachowano ręczne dane: ${result.protectedSteps} liczników kroków i ${result.protectedWeights} pomiarów wagi.`:''}${!result.receivedDays?' Garmin nie zwrócił pomiarów dla tego zakresu.':''}`);
      try{await syncedRef.current?.();}catch{setError('Import zapisano. Odśwież stronę, aby zobaczyć najnowsze pomiary.');}
    }catch(err){setError(err.message);}
    finally{await loadStatus();setBusy(false);}
  }
  async function toggleAuto() {
    setSaving(true);setError('');
    try{const next=await api('/garmin/settings',{method:'POST',body:JSON.stringify({autoEnabled:!status.autoEnabled})});++statusVersion.current;setChecking(false);setStatus(next);}
    catch(err){setError(err.message);}finally{setSaving(false);}
  }
  return <section className="panel garmin-settings" aria-label="Synchronizacja Garmin">
    <div className="garmin-heading"><span className="garmin-icon"><Watch size={23}/></span><div><h2>Garmin Connect</h2><p>Kroki, waga i kalorie aktywne</p></div><span className={`garmin-status ${ready&&status?.lastSuccess&&!status.error?'connected':''}`}>{label}</span></div>
    {local?<p className="garmin-info"><Info size={16}/> Synchronizacja działa w wersji Cloudflare. Lokalny podgląd zapisuje dane wyłącznie w tej przeglądarce.</p>:<>
      <div className="garmin-last"><Clock3 size={15}/><span>Ostatnia udana synchronizacja<strong>{dateTime(status?.lastSuccess)}</strong></span></div>
      <div className="garmin-status-check"><small role="status">{checking?'Sprawdzam konfigurację…':checkedAt?`Stan sprawdzony o ${checkedTime(checkedAt)}`:'Oczekiwanie na status'}</small><button type="button" className="garmin-refresh-status" disabled={checking||busy||saving} onClick={()=>{setError('');loadStatus();}} aria-label="Odśwież status Garmin"><RefreshCw size={15} className={checking?'garmin-spinning':''}/><span>Sprawdź konfigurację</span></button></div>
      {status?.lastResult&&<p className="garmin-info garmin-previous-result">Ostatni import: kroki z {days(status.lastResult.stepsDays)}, waga z {days(status.lastResult.weightDays)}, kalorie aktywne z {days(status.lastResult.calorieDays||0)}.</p>}
      {(error||loadError||status?.error)&&<p className="garmin-error" role="alert">{error||loadError||status.error}</p>}
      {status&&!ready&&<div className="garmin-setup-status"><strong>Co jest gotowe?</strong><ul><li>{status.configured?<Check size={16}/>:<Info size={16}/>}<span>Klucz Garmin na serwerze<small>{status.configured?'Zapisany':'Brakuje sekretu GARMIN_PERSONAL_API_KEY w Cloudflare → Worker form-app.'}</small></span></li><li>{status.schemaReady?<Check size={16}/>:<Info size={16}/>}<span>Baza synchronizacji<small>{status.schemaReady?'Tabele integracji są gotowe.':'Wykonaj migracje 0001_garmin.sql i 0002_garmin_calories.sql w bazie aplikacji.'}</small></span></li></ul></div>}
      {ready&&!status.lastAttempt&&!status.lastSuccess&&<p className="garmin-first-sync"><Info size={16}/><span>Konfiguracja jest gotowa. Pierwsze pobranie kroków, wagi i kalorii aktywnych uruchom przyciskiem <strong>„Synchronizuj teraz”</strong>.</span></p>}
      {ready&&<>
        <div className="garmin-sync-controls"><label className="field"><span>Zakres pobierania</span><select value={range} onChange={event=>{setRange(event.target.value);setOverwrite(false);}} disabled={busy}><option value="1">Dzień wybrany w dzienniku</option><option value="7">Ostatnie 7 dni</option><option value="28">Ostatnie 28 dni</option></select><small>{new Date(from+'T12:00:00').toLocaleDateString('pl-PL')} – {new Date(to+'T12:00:00').toLocaleDateString('pl-PL')}</small></label><button className="garmin-sync-button" disabled={busy||saving||status.busy||!!cooling} onClick={sync}><RefreshCw size={17} className={busy?'garmin-spinning':''}/>{busy?'Synchronizuję…':status.busy?'Synchronizacja trwa…':'Synchronizuj teraz'}</button></div>
        {cooling&&<p className="garmin-info">Kolejne pobranie dostępne po {dateTime(status.retryAt)}.</p>}
        <label className="garmin-overwrite"><input type="checkbox" checked={overwrite} onChange={event=>setOverwrite(event.target.checked)} disabled={busy}/><span>Zastąp również ręcznie wpisane kroki i wagę w tym zakresie<small>Domyślnie ręczne zmiany są zachowane. Notatki zawsze pozostają na miejscu.</small></span></label>
        <div className="garmin-auto"><div><strong>Automatycznie co godzinę</strong><small>Pobiera ostatnie 7 dni, także przy zamkniętej aplikacji. Zachowuje ręczne zmiany.</small></div><button role="switch" aria-label="Automatyczna synchronizacja Garmin" aria-checked={!!status.autoEnabled} disabled={saving||busy} onClick={toggleAuto}><span/></button></div>
      </>}
      {feedback&&<p className="garmin-success" role="status"><Check size={17}/>{feedback}</p>}
      {!ready&&<><button className="garmin-sync-button garmin-sync-unavailable" disabled><RefreshCw size={17}/>Synchronizuj teraz</button><p className="garmin-info">Uzupełnij konfigurację wskazaną powyżej, a następnie wybierz „Sprawdź konfigurację”. Pobieranie pomiarów uruchamia „Synchronizuj teraz”.</p></>}
    </>}
    <details className="garmin-help"><summary>Jak połączyć Garmin?</summary><ol><li>W przeglądarce otwórz <a href="https://connect.garmin.com/app/settings/personalApiToken" target="_blank" rel="noreferrer">Personal API Key w Garmin Connect <ExternalLink size={12}/></a> i utwórz klucz.</li><li>W Cloudflare dodaj go jako sekret <code>GARMIN_PERSONAL_API_KEY</code> do Workera <code>form-app</code>.</li><li>Wykonaj migrację z pliku <code>migrations/0001_garmin.sql</code> i <code>migrations/0002_garmin_calories.sql</code> i wdróż nową wersję aplikacji. Pełna instrukcja jest w pliku <code>GARMIN-CLOUDFLARE.md</code> w projekcie.</li><li>Użyj „Synchronizuj teraz”, a następnie włącz automat, jeśli chcesz.</li></ol><p>Łączymy się z chmurą Garmin. Aktualność pomiarów zależy od ich wcześniejszego przesłania do Garmin Connect. Klucz może wygasnąć — wtedy wygeneruj nowy i podmień sekret w Cloudflare.</p></details>
  </section>;
}
