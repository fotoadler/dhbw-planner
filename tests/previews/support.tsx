/** Local UI fixture with example prices; does not perform real purchases. */
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Product } from '@capgo/native-purchases';
import { SupportSettingsSection, SupportDialog, SupporterOptions } from '../../src/support';
import '../../src/styles.css';
const products = [1,3,5,10].map(amount => ({identifier:`support_gold_${amount}`,price:amount,priceString:`${amount},00 €`})) as Product[];
function Fixture() {
 const [open,setOpen]=useState(false);const [supported,setSupported]=useState(true);
 return <main style={{maxWidth:440,margin:'0 auto',padding:'24px 20px',fontSize:16}}>
  <h1 style={{fontSize:26,margin:'12px 0 28px'}}>Einstellungen</h1>
  <SupportSettingsSection goldUnlocked={supported} onSupport={()=>setOpen(true)} />
  <section className="sheet__section sheet__feedback"><h3>App-Feedback</h3><p className="sheet__note">Ideen, Fehler oder Hinweise direkt an den Entwickler senden.</p><button className="setup__button">Feedback senden ✉️</button></section>
  <p className="sheet__support">Mit freundlicher Unterstützung von <a href="https://dhbw.app/">dhbw.app</a></p>
  <SupporterOptions onRestored={async()=>{}} />
  <label style={{display:'flex',gap:8,marginTop:32,color:'#777',fontSize:12}}><input type="checkbox" checked={supported} onChange={event=>setSupported(event.target.checked)}/>Vorschau: bereits unterstützt</label>
  {open&&<SupportDialog automatic={false} products={products} busy={false} onBusy={()=>{}} onProducts={()=>{}} onClose={()=>setOpen(false)} onSupported={async()=>{}}/>}
 </main>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
