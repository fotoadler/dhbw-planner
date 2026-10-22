import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { WidgetSnapshot } from '../../src/widgets/snapshot';
const mocks = vi.hoisted(() => ({ update: vi.fn(), addListener: vi.fn(), getLaunchUrl: vi.fn(), remove: vi.fn(), native: true }));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => mocks.native }, registerPlugin: () => ({ update: mocks.update }) }));
vi.mock('@capacitor/app', () => ({ App: { addListener: mocks.addListener, getLaunchUrl: mocks.getLaunchUrl } }));
import { useWidgets } from '../../src/widgets/useWidgets';
let root: Root, container: HTMLDivElement;
const onOpen = vi.fn();
const snapshot: WidgetSnapshot = { version:1,unlocked:true,profileId:'main',course:'RV-MK25',updatedAt:1,days:[] };
function Harness({value}:{value:WidgetSnapshot|null}) { useWidgets(value,onOpen); return null; }
const render = async (value:WidgetSnapshot|null) => act(async()=>root.render(createElement(Harness,{value})));
beforeEach(()=>{
 (globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
 vi.clearAllMocks();mocks.native=true;mocks.update.mockResolvedValue(undefined);mocks.getLaunchUrl.mockResolvedValue(undefined);
 mocks.addListener.mockResolvedValue({remove:mocks.remove});
 container=document.createElement('div');document.body.append(container);root=createRoot(container);
});
afterEach(async()=>{await act(async()=>root.unmount());container.remove();});
it('queues a cold-start day link until settings and support state are loaded',async()=>{
 mocks.getLaunchUrl.mockResolvedValue({url:'dhbwplanner://day?date=2026-10-21&profile=main'});
 await render(null);expect(onOpen).not.toHaveBeenCalled();expect(mocks.update).not.toHaveBeenCalled();
 await render(snapshot);expect(onOpen).toHaveBeenCalledExactlyOnceWith({date:'2026-10-21',profileId:'main'});
});
it('serializes snapshots so slow old writes cannot overwrite a new course',async()=>{
 let finish!:()=>void;
 mocks.update.mockImplementationOnce(()=>new Promise<void>(resolve=>{finish=resolve;}));
 await render(snapshot);await render({...snapshot,course:'New course'});
 expect(mocks.update).toHaveBeenCalledTimes(1);
 await act(async()=>finish());
 expect(mocks.update).toHaveBeenCalledTimes(2);
 expect(JSON.parse(mocks.update.mock.calls[1][0].snapshot).course).toBe('New course');
});
it('ignores unrelated links and performs no native operations in the browser',async()=>{
 mocks.native=false;await render(snapshot);expect(mocks.addListener).not.toHaveBeenCalled();expect(mocks.update).not.toHaveBeenCalled();
});

it('opens support from a locked widget and publishes the unlock without restarting',async()=>{
 mocks.getLaunchUrl.mockResolvedValue({url:'dhbwplanner://support'});
 await render(null);expect(onOpen).not.toHaveBeenCalled();
 await render({...snapshot,unlocked:false});expect(onOpen).toHaveBeenCalledExactlyOnceWith('support');
 await render(snapshot);
 expect(JSON.parse(mocks.update.mock.calls.at(-1)![0].snapshot).unlocked).toBe(true);
});
