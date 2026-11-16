import React,{useEffect,useRef} from 'react';
import {parseQuantity} from './foodPortions.js';

function selectQuantity(event) {
  const input=event.currentTarget;
  input.select();
  // Touch browsers may place the caret after dispatching focus/click.
  requestAnimationFrame(()=>{if(document.activeElement===input)input.select();});
}

export default function QuantityInput({value,onChange,whole=false,min=.1,max=100000,autoFocus=false}) {
  const inputRef=useRef(null);
  useEffect(()=>{
    inputRef.current?.setCustomValidity(parseQuantity(value,{whole,min,max})==null
      ?whole?'Wpisz dodatnią liczbę całkowitą.':'Wpisz dodatnią ilość, z maksymalnie dwoma miejscami po przecinku i w dozwolonym zakresie.'
      :'');
  },[value,whole,min,max]);
  return <input ref={inputRef} className="quantity-input" type="text" inputMode={whole?'numeric':'decimal'}
    pattern={whole?'[0-9]+':'[0-9]+([.,][0-9]{1,2})?'} maxLength={12} required value={value}
    onChange={event=>onChange(event.target.value)} onFocus={selectQuantity} onClick={selectQuantity} autoFocus={autoFocus}/>;
}
