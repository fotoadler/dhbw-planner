/** Production dialog with example prices over illustrative screen contexts. No real purchases. */
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Product } from '@capgo/native-purchases';
import { SupportDialog, SupportSettingsSection } from '../../src/support';
import '../../src/styles.css';
const repeatSupport=new URLSearchParams(window.location.search).get('repeat')==='1';
const prices=[1,3,5,10].map(amount=>({identifier:`support_${repeatSupport?'':'gold_'}${amount}`,price:amount,priceString:`${amount},00 €`})) as Product[];
const automatic=new URLSearchParams(window.location.search).get('mode')!=='manual';
function Preview(){
 const [open,setOpen]=useState(true);
 return <main style={{maxWidth:440,margin:'0 auto',padding:'24px 20px'}}>
  <h1 style={{fontSize:26,marginBottom:24}}>{automatic?'Kalender':'Einstellungen'}</h1>
  {automatic ? <><p style={{marginBottom:20}}>Mittwoch, 21. Oktober</p>{['Medienwirtschaft','Kommunikation','Marketing'].map((title,index)=><div key={title} style={{padding:18,borderLeft:'3px solid var(--accent)',background:'var(--bg-soft)',borderRadius:12,marginBottom:14}}><small>{`${9+index*2}:00 – ${10+index*2}:30`}</small><p style={{marginTop:8,fontWeight:600}}>{title}</p></div>)}</> : <SupportSettingsSection goldUnlocked={false} onSupport={()=>setOpen(true)}/>}
  {open&&<SupportDialog automatic={automatic} products={prices} busy={false} onBusy={()=>{}} onProducts={()=>{}} onClose={()=>setOpen(false)} onSupported={async()=>{}}/>}
 </main>;
}
createRoot(document.getElementById('root')!).render(<Preview/>);
