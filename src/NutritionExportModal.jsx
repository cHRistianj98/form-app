import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Check,ChevronLeft,ChevronRight,Copy,Download,FileText} from 'lucide-react';
import Modal from './Modal.jsx';
import {localDay} from './foods.js';
import {buildNutritionExport,exportDate,exportDates,EXPORT_PERIODS,shiftExportPeriod} from './nutritionExport.js';
import './nutrition-export.css';

export function NutritionExportButton({onClick,compact=false}) {
  return compact?<button className="nutrition-export-short" onClick={onClick}><FileText size={16}/> Kopiuj raport</button>:
    <button className="journal-report-button" onClick={onClick}><span className="report-button-icon"><FileText size={20}/></span><span><strong>Raport żywienia</strong><small>Dzień, tydzień lub miesiąc · tekst do skopiowania</small></span><ChevronRight size={18}/></button>;
}

export default function NutritionExportModal({entries,daily,activities,profile,day,initialPeriod='day',onClose}) {
  const [period,setPeriod]=useState(initialPeriod);
  const [anchor,setAnchor]=useState(day);
  const [copyState,setCopyState]=useState('idle');
  const [copying,setCopying]=useState(false);
  const textareaRef=useRef(null);
  const today=localDay();
  const report=useMemo(()=>buildNutritionExport({entries,daily,activities,profile,day:anchor,period,today}),[entries,daily,activities,profile,anchor,period,today]);
  const textRef=useRef(report.text);
  textRef.current=report.text;
  useEffect(()=>setCopyState('idle'),[report.text]);
  const next=shiftExportPeriod(anchor,period,1);
  const nextDisabled=exportDates(next,period)[0]>today;
  const selectAll=()=>{
    const area=textareaRef.current;
    area.focus({preventScroll:true});area.select();area.setSelectionRange(0,area.value.length);
  };
  async function copyAll() {
    const text=report.text;
    setCopying(true);setCopyState('idle');
    let copied=false;
    try {
      if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);copied=true;}
    }catch { /* Fall back to the selected, visible text if browser access is denied. */ }
    if(!copied&&textRef.current===text) {
      selectAll();
      try {copied=document.execCommand('copy');}catch {copied=false;}
    }
    if(textRef.current===text)setCopyState(copied?'copied':'manual');
    setCopying(false);
  }
  function download() {
    const blob=new Blob(['\ufeff',report.text],{type:'text/plain;charset=utf-8'});
    const url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download=`forma-raport-${period}-${report.from}${report.from!==report.to?`-${report.to}`:''}.txt`;
    document.body.append(link);link.click();link.remove();
    window.setTimeout(()=>URL.revokeObjectURL(url),0);
  }
  return <Modal title="Raport żywienia" subtitle="Skopiuj gotowy tekst z posiłkami i suplementami do oceny w ChatGPT." onClose={onClose} wide trapFocus className="nutrition-export-modal">
    <div className="report-period-controls">
      <div className="report-period-switch" role="group" aria-label="Okres raportu">{EXPORT_PERIODS.map(option=><button key={option.id} aria-pressed={period===option.id} onClick={()=>setPeriod(option.id)}>{option.name}</button>)}</div>
      <div className="report-range-nav"><button aria-label="Poprzedni okres raportu" onClick={()=>setAnchor(shiftExportPeriod(anchor,period,-1))}><ChevronLeft size={19}/></button><div><strong>{exportDate(report.from)}{report.from!==report.to?` – ${exportDate(report.to)}`:''}</strong><span>{period==='week'?'Poniedziałek – niedziela':period==='month'?'Miesiąc kalendarzowy':'Wybrany dzień'}{report.includedTo&&report.includedTo!==report.to?` · dane do ${exportDate(report.includedTo)}`:''}</span></div><button aria-label="Następny okres raportu" disabled={nextDisabled} onClick={()=>setAnchor(next)}><ChevronRight size={19}/></button></div>
      <div className="report-counts"><span><b>{report.loggedDays}/{report.elapsedDays}</b> dni z wpisami</span><span><b>{report.foodEntries}</b> wpisów jedzenia</span><span><b>{report.supplementEntries}</b> suplementów</span></div>
    </div>
    <div className="report-text-preview"><div className="report-preview-heading"><label htmlFor="nutrition-report-text">Tekst raportu</label><button onClick={selectAll}>Zaznacz całość</button></div><textarea id="nutrition-report-text" ref={textareaRef} value={report.text} readOnly spellCheck={false} aria-label="Tekst raportu do skopiowania"/></div>
    <div className="report-export-footer"><p role="status" aria-live="polite" className={copyState==='manual'?'report-copy-error':''}>{copyState==='copied'?'Skopiowano cały raport. Możesz wkleić go do czatu.':copyState==='manual'?'Kopiowanie jest zablokowane przez przeglądarkę. Tekst jest zaznaczony — skopiuj go ręcznie lub pobierz TXT.':report.entryCount?'Raport zawiera makro, mikro, cele i informacje o brakach danych.':'Brak wpisów w tym okresie. Raport oznaczy je jako brak danych.'}</p><div className="report-export-actions"><button className="report-download" onClick={download}><Download size={17}/> Pobierz TXT</button><button className="report-copy" onClick={copyAll} disabled={copying}>{copyState==='copied'?<Check size={18}/>:<Copy size={18}/>} {copying?'Kopiuję…':copyState==='copied'?'Skopiowano':'Kopiuj całość'}</button></div></div>
  </Modal>;
}
