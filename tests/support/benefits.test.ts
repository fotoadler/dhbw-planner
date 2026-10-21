import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('../../src/support/icon',()=>({getSupporterIcon:async()=>({gold:false,available:true}),setSupporterIcon:vi.fn()}));
import { SupportSettingsSection } from '../../src/support/ui/SupportSettingsSection';
import { closeSupportPreview } from '../../src/support/previewNavigation';
let root: Root, container: HTMLDivElement;
const support=vi.fn();
beforeEach(async()=>{
 (globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
 vi.clearAllMocks();container=document.createElement('div');document.body.append(container);root=createRoot(container);
 await act(async()=>root.render(createElement(SupportSettingsSection,{onSupport:support,goldUnlocked:false})));
});
afterEach(()=>{act(()=>root.unmount());container.remove();});
const click=async(label:string)=>act(async()=>[...document.querySelectorAll<HTMLButtonElement>('button')].find(button=>button.textContent?.trim()===label)!.click());
it('keeps settings compact with two clickable benefits and the support action',async()=>{
 expect(container.querySelectorAll('.support-gold-benefit')).toHaveLength(2);
 expect(container.textContent).not.toContain('Grundfunktionen');
 expect(container.querySelectorAll('.support-icon-choice')).toHaveLength(0);
 await click('App unterstützen');expect(support).toHaveBeenCalledOnce();
});
it('shows three native widget screenshots with navigation and supports Android Back',async()=>{
 const trigger=container.querySelector<HTMLButtonElement>('.support-gold-benefit')!;trigger.focus();
 await act(async()=>trigger.click());
 expect(document.querySelectorAll('.support-widget-slide img')).toHaveLength(3);
 const next=document.querySelector<HTMLButtonElement>('[aria-label="Nächste Widget-Größe"]')!;
 await act(async()=>next.click());expect(document.querySelector('[aria-label="Mittel anzeigen"]')!.getAttribute('aria-current')).toBe('true');
 await act(async()=>next.click());expect(next.disabled).toBe(true);
 await act(async()=>{expect(closeSupportPreview()).toBe(true);});
 expect(document.querySelector('[role="dialog"]')).toBeNull();expect(document.activeElement).toBe(trigger);
 expect(closeSupportPreview()).toBe(false);
});
it('shows the actual red/gold icons without allowing locked users to change them',async()=>{
 await act(async()=>container.querySelectorAll<HTMLButtonElement>('.support-gold-benefit')[1].click());
 const dialog=document.querySelector('[role="dialog"]')!;
 expect(dialog.querySelectorAll('.support-icon-showcase img')).toHaveLength(2);
 expect(dialog.querySelector('.support-icon-choice')).toBeNull();
 expect(dialog.textContent).not.toContain('App-Symbol ändern');
});
it('consumes Escape before an underlying dialog and restores focus',async()=>{
 await act(async()=>container.querySelector<HTMLButtonElement>('.support-gold-benefit')!.click());
 const parentEscape=vi.fn();document.addEventListener('keydown',parentEscape);
 await act(async()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})));
 expect(parentEscape).not.toHaveBeenCalled();expect(document.querySelector('[role="dialog"]')).toBeNull();
 document.removeEventListener('keydown',parentEscape);
});
