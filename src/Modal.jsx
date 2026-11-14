import React, {useEffect, useRef} from 'react';
import {X} from 'lucide-react';

// Opening a dialog on a phone should not immediately open the keyboard.
export const allowFieldAutofocus = () => !window.matchMedia('(pointer: coarse)').matches;

export default function Modal({title,subtitle,onClose,children,wide=false}) {
  const backdropRef=useRef(null);
  const cardRef=useRef(null);

  useEffect(()=>{
    const body=document.body;
    const opener=document.activeElement;
    const scrollX=window.scrollX, scrollY=window.scrollY;
    const saved=Object.fromEntries(['position','top','left','width','overflow'].map(key=>[key,body.style[key]]));
    body.style.overflow='hidden';
    if (!allowFieldAutofocus()) {
      // iOS needs a fixed body to keep the underlying page at its scroll position.
      Object.assign(body.style,{position:'fixed',top:`-${scrollY}px`,left:`-${scrollX}px`,width:'100%'});
    }
    if (!cardRef.current.contains(document.activeElement)) cardRef.current.focus({preventScroll:true});

    const viewport=window.visualViewport;
    const updateViewport=()=>{
      // Let Safari handle intentional pinch zoom without resizing the dialog to it.
      if (viewport && Math.abs(viewport.scale-1)>0.05) return;
      backdropRef.current?.style.setProperty('--modal-viewport-height',`${viewport?.height ?? window.innerHeight}px`);
      backdropRef.current?.style.setProperty('--modal-viewport-top',`${viewport?.offsetTop ?? 0}px`);
    };
    updateViewport();
    viewport?.addEventListener('resize',updateViewport);
    viewport?.addEventListener('scroll',updateViewport);
    window.addEventListener('resize',updateViewport);

    return ()=>{
      viewport?.removeEventListener('resize',updateViewport);
      viewport?.removeEventListener('scroll',updateViewport);
      window.removeEventListener('resize',updateViewport);
      Object.assign(body.style,saved);
      if (opener?.isConnected) opener.focus({preventScroll:true});
      window.scrollTo(scrollX,scrollY);
    };
  },[]);

  useEffect(()=>{
    const escape=e=>{if(e.key==='Escape')onClose();};
    document.addEventListener('keydown',escape);
    return ()=>document.removeEventListener('keydown',escape);
  },[onClose]);

  return <div ref={backdropRef} className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
    <section ref={cardRef} className={`modal-card ${wide?'modal-wide':''}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
      <div className="modal-top"><div><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div><button className="icon-button" onClick={onClose} aria-label="Zamknij"><X size={19}/></button></div>
      <div className="modal-body">{children}</div>
    </section>
  </div>;
}
