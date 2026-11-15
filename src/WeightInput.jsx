import React, {useEffect, useId, useRef, useState} from 'react';
import {Minus, Plus} from 'lucide-react';
import {formatWeight, MAX_WEIGHT, MIN_WEIGHT, parseWeight, stepWeight, weightError, weightRange} from './weight.js';
import './weight-input.css';

export default function WeightInput({label, value, onChange, required = false, defaultWeight = 93}) {
  const id = useId();
  const input = useRef(null);
  const weight = parseWeight(value);
  const selected = weight ?? parseWeight(defaultWeight) ?? 93;
  const [range, setRange] = useState(() => weightRange(selected));
  const error = weightError(value, required);

  useEffect(() => {input.current?.setCustomValidity(error);}, [error]);
  useEffect(() => {
    if (selected < range.min || selected > range.max) setRange(weightRange(selected));
  }, [selected, range]);

  function adjust(direction) {
    const next = stepWeight(selected, direction);
    onChange(formatWeight(next));
    setRange(weightRange(next));
  }
  function recenter() {setRange(weightRange(selected));}

  return <div className="field weight-field">
    <label id={`${id}-label`} htmlFor={id}>{label}</label>
    <div className="weight-entry">
      <button type="button" className="weight-step" onClick={() => adjust(-1)} disabled={weight !== null && weight <= MIN_WEIGHT} aria-label={`${label}: zmniejsz o 0,01 kg`}><Minus size={18}/></button>
      <div className="with-unit">
        <input ref={input} id={id} type="text" inputMode="decimal" required={required} autoComplete="off" spellCheck={false} placeholder="Nie mierzono" value={value} aria-describedby={`${id}-hint`} onChange={e => onChange(e.target.value)} onBlur={recenter}/>
        <span>kg</span>
      </div>
      <button type="button" className="weight-step" onClick={() => adjust(1)} disabled={weight !== null && weight >= MAX_WEIGHT} aria-label={`${label}: zwiększ o 0,01 kg`}><Plus size={18}/></button>
    </div>
    <div className="weight-ruler">
      <div className="weight-ruler-ticks" aria-hidden="true"/>
      <input className="weight-range" type="range" min={range.min} max={range.max} step="0.01" value={selected} aria-labelledby={`${id}-label`} aria-valuetext={weight === null ? `Nie mierzono. Suwak od ${formatWeight(selected)} kg` : `${formatWeight(selected)} kg`} aria-describedby={`${id}-hint`} onChange={e => onChange(formatWeight(Number(e.target.value)))} onPointerUp={recenter} onKeyUp={recenter}/>
      <div className="weight-ruler-labels" aria-hidden="true">{Array.from({length: 5}, (_, i) => <span key={i}>{formatWeight(range.min + i * (range.max - range.min) / 4)}</span>)}</div>
    </div>
    <small id={`${id}-hint`} className="field-hint">Przesuń podziałkę lub wpisz np. 93,45 albo 93.45. Przyciski: ±0,01 kg.</small>
  </div>;
}
