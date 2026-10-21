import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { SupportState } from '../../src/support/state';
const mocks=vi.hoisted(()=>({
 state:null as SupportState|null, native:true, catalog:[] as object[],
 start:vi.fn(), update:vi.fn(), resume:vi.fn(), recover:vi.fn(),
}));
vi.mock('../../src/support/state',async original=>({
 ...await original<object>(),startSupportSession:mocks.start,updateSupportState:mocks.update,resumeSupportSession:mocks.resume,
}));
vi.mock('../../src/support/purchases',()=>({
 nativeSupportAvailable:()=>mocks.native,recoverSupportPurchases:mocks.recover,
 loadSupportProducts:async()=>mocks.catalog,SUPPORT_PRODUCTS:['support_1','support_3','support_5','support_10'],
}));
vi.mock('@capacitor/app',()=>({App:{addListener:async()=>({remove:()=>{}})}}));
vi.mock('@capgo/native-purchases',()=>({NativePurchases:{addListener:async()=>({remove:()=>{}})}}));
import { initialSupportState, DAY } from '../../src/support/state';
import { useSupport } from '../../src/support/useSupport';
let root:Root, container:HTMLDivElement, result:ReturnType<typeof useSupport>;
function Harness({ready=true}:{ready?:boolean}) {result=useSupport(true,false,ready);return null;}
async function render(ready=true){await act(async()=>root.render(createElement(Harness,{ready})));}
async function advance(ms:number){await act(async()=>{await vi.advanceTimersByTimeAsync(ms);});}
beforeEach(()=>{
 (globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
 vi.useFakeTimers();vi.setSystemTime(100*DAY);vi.clearAllMocks();mocks.native=true;
 mocks.state={...initialSupportState(false,0),sessions:10};
 mocks.catalog=[1,3,5,10].map(amount=>({identifier:`support_gold_${amount}`,price:amount,priceString:`${amount},00 €`}));
 mocks.start.mockImplementation(async()=>mocks.state);mocks.resume.mockResolvedValue(undefined);mocks.recover.mockResolvedValue(false);
 mocks.update.mockImplementation(async(change:(s:SupportState)=>SupportState)=>mocks.state=change(mocks.state!));
 container=document.createElement('div');document.body.append(container);root=createRoot(container);
});
afterEach(()=>{act(()=>root.unmount());container.remove();vi.useRealTimers();});
it('waits 1.5 seconds on a ready calendar, counts one prompt and does not reopen in that runtime',async()=>{
 await render();await advance(1499);expect(result.open).toBe(false);
 await advance(1);expect(result.open).toBe(true);expect(result.automatic).toBe(true);expect(mocks.state!.promptCount).toBe(1);
 await act(async()=>result.close());await advance(46*DAY);await render(false);await render(true);await advance(2000);
 expect(result.open).toBe(false);expect(mocks.state!.promptCount).toBe(1);
});
it('cancels the delay when the calendar stops being ready and retries on returning',async()=>{
 await render();await advance(1000);await render(false);await advance(2000);
 expect(result.open).toBe(false);expect(mocks.state!.promptCount).toBe(0);
 await render(true);await advance(1500);expect(result.open).toBe(true);
});
it.each([{dismissed:true},{hasSupported:true},{pending:true},{promptCount:2}])('suppresses automatic reminders for %j but allows manual opening',async patch=>{
 mocks.state={...mocks.state!,...patch};await render();await advance(2000);expect(result.open).toBe(false);
 await act(async()=>result.show());expect(result.open).toBe(true);expect(result.automatic).toBe(false);
});
it.each(['incomplete catalog','browser'])('does not automatically prompt in the %s case',async scenario=>{
 if(scenario==='browser')mocks.native=false;
 else mocks.catalog=mocks.catalog.slice(0,3);
 await render();await advance(2000);expect(result.open).toBe(false);expect(mocks.state!.promptCount).toBe(0);
});
it('waits for purchase recovery and suppresses prompting when a previous purchase is found',async()=>{
 let finish!:()=>void;
 mocks.recover.mockImplementationOnce(()=>new Promise<void>(resolve=>{finish=()=>{mocks.state={...mocks.state!,hasSupported:true};resolve();};}));
 await render();await advance(2000);expect(result.open).toBe(false);
 await act(async()=>finish());await advance(2000);expect(result.open).toBe(false);expect(mocks.state!.promptCount).toBe(0);
});
it('persists never-ask-again and closes the automatic dialog',async()=>{
 await render();await advance(1500);await act(async()=>result.dismiss());
 expect(result.open).toBe(false);expect(mocks.state!.dismissed).toBe(true);
});
