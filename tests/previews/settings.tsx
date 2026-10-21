/** Interactive settings fixture; edits stay in memory and never reach a device/store. */
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { SettingsView } from '../../src/ui/SettingsView';
import { DEFAULT_SETTINGS } from '../../src/store/preferences';
import '../../src/styles.css';
function Fixture() {
 const [settings,setSettings]=useState({...DEFAULT_SETTINGS,scheduleSource:'dhbw-api' as const,apiSelection:{site:'RV',degree:'BWL',course:'RV-WMKMM24B'}});
 useEffect(()=>{document.documentElement.dataset.theme=settings.themeMode === 'dark' ? 'dark' : 'light';},[settings.themeMode]);
 return <div style={{maxWidth:600,margin:'0 auto'}}>
  <header style={{padding:'32px 20px 12px'}}><h1 style={{fontSize:28}}>Einstellungen</h1></header>
  <SettingsView settings={settings} availableModules={[]} updatedAt={new Date('2026-10-21T15:16:00+02:00')} onChange={next=>setSettings(next as typeof settings)} onChangeSource={()=>{}} onSupport={()=>{}} goldUnlocked onSupportRestored={async()=>{}} />
 </div>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
