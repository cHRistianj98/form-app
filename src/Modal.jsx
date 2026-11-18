import React, {useEffect, useRef} from 'react';
import {X} from 'lucide-react';

// Opening a dialog on a phone should not immediately open the keyboard.
export const allowFieldAutofocus = () => !window.matchMedia('(pointer: coarse)').matches;

export default function Modal({title,subtitle,onClose,children,footer=null,wide=false,className='',trapFocus=false}) {
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
    let lastViewportHeight,focusFrame;
    const updateViewport=()=>{
      // Let Safari handle intentional pinch zoom without resizing the dialog to it.
      if (viewport && Math.abs(viewport.scale-1)>0.05) return;
      const height=viewport?.height ?? window.innerHeight;
      const shrank=lastViewportHeight!=null&&height<lastViewportHeight-1;
      lastViewportHeight=height;
      backdropRef.current?.style.setProperty('--modal-viewport-height',`${height}px`);
      backdropRef.current?.style.setProperty('--modal-viewport-top',`${viewport?.offsetTop ?? 0}px`);
      if(shrank) {
        cancelAnimationFrame(focusFrame);
        focusFrame=requestAnimationFrame(()=>{
          const input=document.activeElement,scroller=cardRef.current?.querySelector('.modal-body');
          if(!input?.matches('input,textarea,select')||!scroller?.contains(input))return;
          // Scroll only the dialog body; a fixed footer stays above the keyboard.
          const field=input.getBoundingClientRect(),visible=scroller.getBoundingClientRect();
          if(field.height>visible.height-24||field.top<visible.top+12)scroller.scrollTop+=field.top-visible.top-12;
          else if(field.bottom>visible.bottom-12)scroller.scrollTop+=field.bottom-visible.bottom+12;
        });
      }
    };
    updateViewport();
    viewport?.addEventListener('resize',updateViewport);
    viewport?.addEventListener('scroll',updateViewport);
    window.addEventListener('resize',updateViewport);

    return ()=>{
      cancelAnimationFrame(focusFrame);
      viewport?.removeEventListener('resize',updateViewport);
      viewport?.removeEventListener('scroll',updateViewport);
      window.removeEventListener('resize',updateViewport);
      Object.assign(body.style,saved);
      if (opener?.isConnected) opener.focus({preventScroll:true});
      window.scrollTo(scrollX,scrollY);
    };
  },[]);

  useEffect(()=>{
    const escape=e=>{
      if(e.key==='Escape'){e.preventDefault();onClose();}
      if(trapFocus&&e.key==='Tab') {
        const controls=[...cardRef.current.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex]:not([tabindex="-1"])')].filter(element=>element.tabIndex>=0&&element.getClientRects().length);
        const first=controls[0],last=controls.at(-1);
        if(!first){e.preventDefault();return;}
        if(e.shiftKey&&(document.activeElement===first||!controls.includes(document.activeElement))){e.preventDefault();last.focus();}
        else if(!e.shiftKey&&(document.activeElement===last||!controls.includes(document.activeElement))){e.preventDefault();first.focus();}
      }
    };
    document.addEventListener('keydown',escape);
    return ()=>document.removeEventListener('keydown',escape);
  },[onClose,trapFocus]);

  return <div ref={backdropRef} className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
    <section ref={cardRef} className={`modal-card ${wide?'modal-wide':''} ${className}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
      <div className="modal-top"><div><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div><button className="icon-button" onClick={onClose} aria-label="Zamknij"><X size={19}/></button></div>
      <div className="modal-body">{children}</div>
      {footer&&<div className="modal-footer">{footer}</div>}
    </section>
  </div>;
}
