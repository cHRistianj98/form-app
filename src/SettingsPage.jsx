import React, {useEffect, useState} from 'react';
import {Check, CircleHelp, Download, Info, LogOut, ShieldCheck, Target} from 'lucide-react';
import {calcTargets, fmt, parseNum} from './foods.js';
import {ACTIVITY_LEVELS, NUTRITION_SOURCES} from './profile.js';
import MacroValues from './MacroValues.jsx';
import WeightInput from './WeightInput.jsx';
import {formatWeight, parseWeight, weightError} from './weight.js';
import SupplementPlanSettings from './SupplementPlanSettings.jsx';

export default function SettingsPage({profile, currentWeight, personal=[], onSave, onExport, local, onLogout}) {
  const [form,setForm]=useState({...profile});
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const [credits,setCredits]=useState(null);
  useEffect(()=>setForm({...profile}),[profile]);
  function change(key,value) {setForm(p=>({...p,[key]:value})); setError('');}
  const numeric=['height','startWeight','targetWeight','age','deficit','deficitPercent','proteinFactor','fatFactor','manualCalories','manualProtein'];
  const parsed=Object.fromEntries(Object.entries(form).map(([k,v])=>[k,['startWeight','targetWeight'].includes(k)?parseWeight(v):numeric.includes(k)?parseNum(v):v]));
  const preview=calcTargets(parsed,currentWeight || parsed.startWeight);
  async function submit(e) {
    e.preventDefault(); setError('');
    const invalidWeight=weightError(form.startWeight,true)||weightError(form.targetWeight,true);
    if (invalidWeight) {setError(invalidWeight); return;}
    if (!preview.macrosFit || preview.calories<=0) {setError('Cel kalorii musi pokrywać wybrane białko i tłuszcze. Zwiększ kalorie lub zmień makro.'); return;}
    setSaving(true);
    try {await onSave(parsed);} catch(err) {setError(err.message);} finally {setSaving(false);}
  }
  async function showCredits(e) {
    if (!e.currentTarget.open || credits) return;
    try {
      const response=await fetch('/foods/credits.json');
      if (!response.ok) throw new Error();
      setCredits(await response.json());
    } catch {setCredits(false);}
  }
  return <><SupplementPlanSettings profile={profile} personal={personal} onSave={onSave}/><div className="settings-grid">
    <div className="panel">
      <div className="section-heading"><div><h2>Twój plan żywieniowy</h2><p>Dane, założenia i wyliczenia w jednym miejscu.</p></div></div>
      <form onSubmit={submit}>
        <div className="plan-preset"><Target size={22}/><div><strong>Twój punkt startowy</strong><span>2600 kcal — 180 g białka dziennie</span></div><button type="button" className="text-link" onClick={()=>setForm(p=>({...p,manualCalories:2600,manualProtein:180}))}>Ustaw</button></div>
        <div className="field-row">
          <label className="field"><span>Wzrost (cm)</span><input type="number" required min="100" max="250" value={form.height} onChange={e=>change('height',e.target.value)}/></label>
          <label className="field"><span>Wiek (lata)</span><input type="number" required min="19" max="110" step="1" value={form.age} onChange={e=>change('age',e.target.value)}/></label>
        </div>
        <label className="field"><span>Płeć używana we wzorach</span><select value={form.sex} onChange={e=>change('sex',e.target.value)}><option value="male">Mężczyzna</option><option value="female">Kobieta</option></select></label>
        <div className="field-row weight-profile-row">
          <WeightInput label="Waga początkowa (kg)" required value={form.startWeight} onChange={value=>change('startWeight',value)}/>
          <WeightInput label="Waga docelowa (kg)" required value={form.targetWeight} onChange={value=>change('targetWeight',value)}/>
        </div>
        <p className="help-note">Wyliczenia dla {formatWeight(preview.weight)} kg {currentWeight?'z ostatniego pomiaru do wybranego dnia.':'z wagi początkowej.'} Sprawdź wiek i poziom aktywności — wpływają na szacunek zapotrzebowania.</p>
        <div className="subsection-title">Jak wyznaczać zapotrzebowanie?</div>
        <label className="field"><span>Metoda obliczeń</span><select value={form.energyMethod} onChange={e=>change('energyMethod',e.target.value)}><option value="mifflin">Mifflin–St Jeor + aktywność</option><option value="eer2023">EER — normy DRI 2023</option></select></label>
        <label className="field"><span>Twoja przeciętna aktywność w całym tygodniu</span><select value={form.activityLevel} onChange={e=>change('activityLevel',e.target.value)}>{ACTIVITY_LEVELS.map(a=><option key={a.id} value={a.id}>{a.name} — PAL {fmt(a.pal,2)}</option>)}</select><small className="field-hint">{preview.activity.description}</small></label>
        <div className="field-row">
          <label className="field"><span>Rodzaj deficytu</span><select value={form.deficitMode} onChange={e=>change('deficitMode',e.target.value)}><option value="percent">Procent zapotrzebowania</option><option value="kcal">Stała liczba kcal</option></select></label>
          {form.deficitMode==='percent'?<label className="field"><span>Deficyt (%) — 0 = utrzymanie</span><input type="number" required min="0" max="25" step="1" value={form.deficitPercent} onChange={e=>change('deficitPercent',e.target.value)}/></label>:<label className="field"><span>Deficyt (kcal / dzień)</span><input type="number" required min="0" max="1300" step="1" value={form.deficit} onChange={e=>change('deficit',e.target.value)}/></label>}
        </div>
        <div className="calculation-card" aria-live="polite">
          <div className="calculation-heading"><span>WYLICZENIE Z TWOICH DANYCH</span><span>{preview.method==='mifflin'?'Mifflin–St Jeor':'EER / DRI 2023'}</span></div>
          <dl><div><dt>Spoczynkowe (Mifflin)</dt><dd>{fmt(preview.bmr)} kcal</dd></div><div><dt>Utrzymanie wagi, z aktywnością</dt><dd>{fmt(preview.base)} kcal</dd></div><div><dt>Wybrany deficyt</dt><dd>−{fmt(preview.requestedDeficit)} kcal</dd></div><div className="calculation-total"><dt>Cel z kalkulatora</dt><dd>{fmt(preview.automaticCalories)} kcal</dd></div></dl>
          <p>Druga metoda dla porównania: {preview.method==='mifflin'?'EER / DRI 2023':'Mifflin + PAL'} ≈ {fmt(preview.method==='mifflin'?preview.eer:preview.mifflin)} kcal na utrzymanie. Rozbieżność pokazuje ograniczenia szacunku.</p>
          {Number(form.manualCalories)>0&&<button className="text-link" type="button" onClick={()=>change('manualCalories',0)}>Użyj celu z kalkulatora</button>}
        </div>
        <label className="field"><span>Własny cel kalorii (0 = wynik kalkulatora)</span><input type="number" required min="0" max="6000" step="1" value={form.manualCalories} onChange={e=>change('manualCalories',e.target.value)}/><small className="field-hint">Własny cel ma pierwszeństwo. Wybrany deficyt dotyczy wyłącznie kalkulatora.</small></label>
        <div className="subsection-title">Białko, tłuszcze i węglowodany</div>
        <label className="field"><span>Stały cel białka (g / dzień; 0 = z masy ciała)</span><input type="number" required min="0" max="400" step="1" value={form.manualProtein} onChange={e=>change('manualProtein',e.target.value)}/></label>
        <div className="field-row">
          <label className="field"><span>Białko (g / kg aktualnej wagi)</span><input type="number" required min="0.5" max="3.5" step="0.01" disabled={Number(form.manualProtein)>0} value={form.proteinFactor} onChange={e=>change('proteinFactor',e.target.value)}/></label>
          <label className="field"><span>Tłuszcze (g / kg wagi docelowej)</span><input type="number" required min="0.3" max="2" step="0.1" value={form.fatFactor} onChange={e=>change('fatFactor',e.target.value)}/></label>
        </div>
        <p className="help-note">Białko: {fmt(preview.protein/preview.weight,2)} g/kg aktualnej wagi. Węglowodany wypełniają pozostałe kalorie (4 kcal/g białka i węgli, 9 kcal/g tłuszczu).</p>
        <div className="profile-preview"><Target size={21}/><div><strong>{fmt(preview.calories)} kcal / dzień — {preview.manual?'Twój cel':'z kalkulatora'}</strong><MacroValues values={preview}/></div></div>
        {(!preview.macrosFit||error)&&<p className="form-error" role="alert">{error||'Wybrane białko i tłuszcze przekraczają cel kalorii. Zmień kalorie lub makro.'}</p>}
        <button type="submit" className="button primary" disabled={saving||!preview.macrosFit}><Check size={18}/>{saving?'Zapisywanie…':'Zapisz ustawienia'}</button>
      </form>
    </div>
    <aside className="settings-aside">
      <div className="panel tip-panel"><span className="icon-badge sun"><CircleHelp size={22}/></span><h3>Dobry punkt startowy. Potem dane.</h3><p>Mifflin–St Jeor szacuje energię w spoczynku, a poziom aktywności pozwala oszacować cały dzień. EER z DRI 2023 wyznacza całkowite zapotrzebowanie osobnym równaniem dla wybranej aktywności.</p><p>2600 kcal i 180 g białka to Twój wybrany punkt startowy. Żaden wzór nie mierzy indywidualnego metabolizmu. Poziom aktywności obejmuje już zwykłe spacery i treningi, więc zapis ruchu nie podnosi ponownie limitu jedzenia.</p><p>Obserwuj średnią masę ciała z 7 dni przez 2–4 tygodnie przy rzetelnym zapisie jedzenia. Jeśli tempo zmian odbiega od planu, skoryguj cel o około 100–150 kcal i ponownie obserwuj trend. To praktyczna korekta, nie automatyczny pomiar spalania.</p><p>ISSN wskazuje zwykle 1,4–2,0 g białka/kg dla osób ćwiczących; potrzeby podczas deficytu mogą być wyższe. Wzory EER w tym kalkulatorze dotyczą osób od 19 lat.</p><div className="nutrition-sources">{NUTRITION_SOURCES.map(s=><a key={s.url} href={s.url} target="_blank" rel="noreferrer">{s.name} ↗</a>)}</div></div>
      <div className="panel"><span className="icon-badge mint"><ShieldCheck size={22}/></span><h3>Twoje dane, Twoja kontrola</h3><p>{local?'Pracujesz lokalnie — dane zapisują się w tej przeglądarce.':'Dziennik jest przechowywany w prywatnej bazie Cloudflare D1. Dostęp wymaga hasła.'}</p><button className="button outline full" onClick={onExport}><Download size={17}/> Eksportuj dane do JSON</button>{!local&&<button className="button ghost full" onClick={onLogout}><LogOut size={17}/> Wyloguj się</button>}</div>
      <div className="panel photo-credits"><span className="icon-badge mint"><Info size={22}/></span><h3>Zdjęcia produktów</h3><p>Zdjęcia z Wikimedia Commons, Open Food Facts oraz stron produktowych, zapisane lokalnie jako WebP. Przy produktach z Twojej listy wartości pochodzą z podanej tabeli. Zdjęcie opakowania lub serii jest poglądowe — sprawdzaj wariant i etykietę.</p><details onToggle={showCredits}><summary>Autorzy, źródła i licencje zdjęć</summary>{credits===null?<p>Wczytywanie…</p>:credits===false?<a href="/foods/credits.json">Otwórz pełne informacje o zdjęciach</a>:Object.values(credits).map(c=><div className="photo-credit" key={c.image}><a href={c.source} target="_blank" rel="noreferrer">{c.title}</a><span>{c.author}</span><a href={c.licenseUrl||c.source} target="_blank" rel="noreferrer">{c.license}</a><small>{c.changes}</small></div>)}</details></div>
    </aside>
  </div></>;
}
