import React from 'react';
import {ChevronDown} from 'lucide-react';
import './settings-sections.css';

// Keep the content mounted: folding a section must preserve unfinished edits.
export default function SettingsSection({id,title,description,icon:Icon,badge,className='',ariaLabel,onToggle,children}) {
  return <details id={id} className={`panel settings-section ${className}`} aria-label={ariaLabel||title} onToggle={onToggle}>
    <summary className="settings-section-summary">
      {Icon&&<span className="settings-section-icon"><Icon size={21} aria-hidden="true"/></span>}
      <div className="settings-section-copy"><div className="settings-section-title"><h2>{title}</h2>{badge}</div>{description&&<p>{description}</p>}</div>
      <ChevronDown className="settings-section-chevron" size={19} aria-hidden="true"/>
    </summary>
    <div className="settings-section-content">{children}</div>
  </details>;
}
