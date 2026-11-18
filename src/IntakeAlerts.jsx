import React from 'react';
import {ChevronDown,TriangleAlert} from 'lucide-react';
import {fmt} from './foods.js';
import {LIMIT_STATUS_LABELS,UL_SOURCE} from './intakeAlerts.js';
import './intake-alerts.css';

const amount=(value,unit)=>`${fmt(value,value>0&&value<.01?6:2)} ${unit}`;
const dateLabel=day=>new Date(day+'T12:00:00').toLocaleDateString('pl-PL',{day:'numeric',month:'short'});

function Overlaps({rows,planned=false}) {
  return <ul className="intake-alerts-list">{rows.map(row=><li key={row.key}>
    <strong>{row.name}</strong>
    <ul className="intake-alerts-sources">{row.products.map((product,i)=><li key={i}>
      {product.name} — {product.upper?'do ':''}{amount(product.amount,row.unit)}{planned&&` (${product.schedule.toLocaleLowerCase('pl-PL')})`}
    </li>)}</ul>
  </li>)}</ul>;
}

export default function IntakeAlerts({days,plannedOverlaps=[],showDates=false}) {
  const flagged=days.filter(day=>day.limits.length||day.overlaps.length);
  const limits=flagged.flatMap(day=>day.limits);
  if(!flagged.length&&!plannedOverlaps.length)return null;

  const exceeded=limits.filter(row=>row.status==='over');
  const names=rows=>[...new Set(rows.map(row=>row.name))].join(', ');
  const summary=exceeded.length?`Powyżej UL: ${names(exceeded)}`:limits.length?`Sprawdź UL: ${names(limits)}`:
    flagged.length?`Wspólne składniki w przyjętych suplementach: ${names(flagged.flatMap(day=>day.overlaps))}`:`Wspólne składniki w planie: ${names(plannedOverlaps)}`;
  return <details className={`panel intake-alerts ${exceeded.length?'intake-alerts-over':''}`}>
    <summary><TriangleAlert size={19} aria-hidden="true"/><div><strong>Alerty żywieniowe</strong><small>{summary}</small></div><ChevronDown size={18} aria-hidden="true"/></summary>
    <div className="intake-alerts-content">
      {flagged.map(day=><div className="intake-alerts-day" key={day.day}>
        {showDates&&<h3>{dateLabel(day.day)}</h3>}
        {day.limits.length>0&&<ul className="intake-alerts-list">{day.limits.map(row=><li key={row.key}>
          <div className="intake-alerts-limit"><strong>{row.name}</strong><span data-ul-status={row.status}>{LIMIT_STATUS_LABELS[row.status]}</span></div>
          <p>{row.status==='possible'?'Suma z górnymi granicami':'Znana suma'} {amount(row.value,row.unit)} / UL {amount(row.limit,row.unit)} dziennie.</p>
          <small>{row.supplementsOnly?'Porównanie ilości z suplementów.':row.supplementAmount>0?`Z suplementów ${row.supplementUpper?'do ':''}${amount(row.supplementAmount,row.unit)}.`:'Suma z zapisanych źródeł.'}</small>
        </li>)}</ul>}
        {day.overlaps.length>0&&<><h3>Wspólne składniki w przyjętych suplementach</h3><Overlaps rows={day.overlaps}/></>}
      </div>)}
      {plannedOverlaps.length>0&&<div className="intake-alerts-day"><h3>Wspólne składniki w planie</h3><p>Porcje się sumują, jeśli przyjmiesz te produkty tego samego dnia.</p><Overlaps rows={plannedOverlaps} planned/></div>}
      {limits.length>0&&<p className="intake-alerts-note">UL dotyczy regularnego spożycia przez dorosłych. Porównanie opiera się na wpisanych ilościach. <a href={UL_SOURCE.url} target="_blank" rel="noreferrer">Tabela EFSA/SCF ↗</a></p>}
    </div>
  </details>;
}
