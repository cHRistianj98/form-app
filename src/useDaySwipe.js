import {useRef} from 'react';
import {localDay} from './foods.js';
import {adjacentDiaryDay,daySwipeDirection} from './calendar.js';

const excluded='input,textarea,select,label,form,[contenteditable]:not([contenteditable="false"]),[role="slider"],[role="dialog"],[data-no-day-swipe]';

function horizontalScroller(target,root) {
  for(let element=target;element&&element!==root;element=element.parentElement) {
    if(element.scrollWidth>element.clientWidth+4&&/auto|scroll/.test(getComputedStyle(element).overflowX))return true;
  }
  return false;
}

export default function useDaySwipe({day,onChange,disabled=false}) {
  const gesture=useRef(null),suppressClick=useRef(0);
  const modalOpen=()=>!!document.querySelector('[role="dialog"][aria-modal="true"]');
  return {
    onTouchStart(event) {
      gesture.current=null;suppressClick.current=0;
      if(disabled||event.touches.length!==1||modalOpen())return;
      const target=event.target instanceof Element?event.target:event.target.parentElement;
      if(target.closest(excluded)||horizontalScroller(target,event.currentTarget))return;
      const touch=event.touches[0];
      // Reserve browser edge gestures and keep native back navigation usable.
      if(touch.clientX<24||touch.clientX>window.innerWidth-24)return;
      gesture.current={x:touch.clientX,y:touch.clientY,id:touch.identifier,time:performance.now(),day,maxY:0};
    },
    onTouchMove(event) {
      const start=gesture.current;if(!start)return;
      if(event.touches.length!==1){gesture.current=null;return;}
      const touch=event.touches[0];
      const dx=touch.clientX-start.x,dy=touch.clientY-start.y;
      start.maxY=Math.max(start.maxY,Math.abs(dy));
      // Once a vertical scroll has begun, changing direction must not change day.
      if((Math.abs(dy)>16&&Math.abs(dy)>Math.abs(dx))||start.maxY>50)gesture.current=null;
    },
    onTouchEnd(event) {
      const start=gesture.current;gesture.current=null;
      if(!start||disabled||modalOpen()||start.day!==day||event.touches.length)return;
      const touch=[...event.changedTouches].find(item=>item.identifier===start.id);if(!touch)return;
      const direction=daySwipeDirection({dx:touch.clientX-start.x,dy:touch.clientY-start.y,maxY:start.maxY,duration:performance.now()-start.time});
      if(!direction)return;
      const next=adjacentDiaryDay(day,direction,localDay());
      // Prevent the swipe's trailing click from expanding a meal or adding food.
      // A fresh touch immediately clears this guard, so the next tap still works.
      suppressClick.current=performance.now()+500;
      if(next!==day)onChange(next);
    },
    onTouchCancel(){gesture.current=null;},
    onClickCapture(event) {
      if(event.detail>0&&performance.now()<suppressClick.current){event.preventDefault();event.stopPropagation();suppressClick.current=0;}
    },
  };
}
