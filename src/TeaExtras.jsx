import React,{useState} from 'react';
import {ChevronDown,Minus,Plus} from 'lucide-react';
import QuantityInput from './QuantityInput.jsx';
import {parseQuantity} from './foodPortions.js';
import {TEA_ADDONS} from './tea.js';
import {hasTeaExtras} from './teaRecipe.js';
import './tea-extras.css';

export default function TeaExtras({value,onChange}) {
  const [expanded,setExpanded]=useState(()=>hasTeaExtras(value));
  const selected=TEA_ADDONS.filter(addon=>parseQuantity(value[addon.key],{min:0,max:20})>0);
  const fruit=selected.some(addon=>addon.key!=='sugar');
  const update=(key,next)=>onChange({...value,[key]:next});
  function step(key,delta) {
    const current=parseQuantity(value[key],{min:0,max:20})??0;
    update(key,String(Math.max(0,Math.min(20,Math.round((current+delta)*100)/100))));
  }
  return <div className="tea-extras">
    <button className="tea-extras-toggle" type="button" aria-expanded={expanded} aria-controls="tea-addons" onClick={()=>setExpanded(!expanded)}>
      <span><strong>Dodatki do herbaty</strong><small>{selected.length?selected.map(addon=>addon.name).join(', '):'Opcjonalnie · cytrusy, imbir, cukier'}</small></span><ChevronDown size={18}/>
    </button>
    <div id="tea-addons" hidden={!expanded} className="tea-extras-body">
      <p>Ilości na <strong>1 kubek (250 ml)</strong>. Przy większej porcji doliczą się proporcjonalnie.</p>
      {TEA_ADDONS.map(addon=><div className="tea-addon-row" key={addon.key}>
        <span className="tea-addon-name"><strong>{addon.name}</strong><small>{addon.description}</small></span>
        <div className="tea-addon-counter">
          <button type="button" aria-label={`Mniej: ${addon.name}`} disabled={Number(value[addon.key])===0} onClick={()=>step(addon.key,-1)}><Minus size={15}/></button>
          <QuantityInput value={value[addon.key]} onChange={next=>update(addon.key,next)} min={0} max={20} ariaLabel={`${addon.name} — ${addon.unit}`}/>
          <button type="button" aria-label={`Więcej: ${addon.name}`} disabled={Number(value[addon.key])===20} onClick={()=>step(addon.key,1)}><Plus size={15}/></button>
        </div>
      </div>)}
      <p className="tea-addon-hint">Możesz wpisać np. 0,5 łyżeczki cukru.</p>
      {fruit&&<div className="tea-infusion-note"><label><input type="checkbox" checked={value.consumeAdditions} onChange={event=>update('consumeAdditions',event.target.checked)}/><span>Zjadam całe owoce i imbir</span></label><p>{value.consumeAdditions?'Doliczamy cały miąższ i imbir. Witaminy są oszacowane dla surowych dodatków.':'Plastry zostają w kubku. Liczymy napar i cukier; dodatkowe składniki z plastrów pozostają nieznane.'}</p></div>}
    </div>
  </div>;
}
