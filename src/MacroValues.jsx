import React from 'react';
import {displayFoodNutrientLabel as foodNutrientLabel,nutrientDescription} from './nutritionDisplay.js';
import {MACRO_PRESENTATION} from './macroPresentation.js';

export default function MacroValues({values,food,className=''}) {
  return <span className={`macro-values ${className}`} aria-label="Makroskładniki">
    {MACRO_PRESENTATION.map(m=><span className="macro-value" data-macro={m.key} key={m.key} style={{'--macro-color':m.color}}>
      <span className="macro-value-name">{m.name}</span>
      <strong title={nutrientDescription(food||values,m.key)}>{foodNutrientLabel(food||values,m.key,values[m.key])}{values[m.key]!=null&&<small> g</small>}</strong>
    </span>)}
  </span>;
}
