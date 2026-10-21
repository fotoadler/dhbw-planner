import { expect, it } from 'vitest';
import { widgetSnapshot, widgetDayState, parseWidgetLink, widgetCourseLabel } from '../../src/widgets/snapshot';
import type { ScheduleEntry } from '../../src/types';
const lecture = (start: string, end: string, title='Medienwirtschaft'): ScheduleEntry => ({start:new Date(start),end:new Date(end),title,rooms:['RV 201'],lecturers:['Name'],type:'lecture'});
const base = {unlocked:true,profileId:'primary',course:'RV-MK25',entries:[],updatedAt:new Date('2026-10-21T06:00:00Z'),loadedWeeks:['2026-10-19'],fullCourse:false,now:new Date('2026-10-21T07:00:00Z')};
it('builds a bounded minimal snapshot and excludes credentials and lecturers',()=>{
 const snapshot=widgetSnapshot({...base,entries:[lecture('2026-10-21T08:00Z','2026-10-21T10:00Z')]});
 expect(snapshot.days).toHaveLength(14);expect(snapshot.days[0].events[0]).toEqual({title:'Medienwirtschaft',start:1792569600000,end:1792576800000,room:'RV 201'});
 expect(JSON.stringify(snapshot)).not.toContain('lecturers');
});
it('distinguishes unloaded weeks from a known empty day',()=>{
 const snapshot=widgetSnapshot(base);
 expect(widgetDayState(snapshot,new Date('2026-10-21T09:00Z'))).toBe('free');
 expect(widgetDayState(snapshot,new Date('2026-10-27T09:00Z'))).toBe('unknown');
});
it('does not claim no lectures before any successful load',()=>{
 expect(widgetDayState(widgetSnapshot({...base,updatedAt:null}),base.now)).toBe('unknown');
});
it('redacts event data for users without a confirmed support entitlement',()=>{
 const s=widgetSnapshot({...base,unlocked:false,entries:[lecture('2026-10-21T08:00Z','2026-10-21T10:00Z')]});
 expect(widgetDayState(s,base.now)).toBe('locked');expect(s.days.every(d=>d.events.length===0)).toBe(true);
});
it('changes from upcoming to finished exactly at the end time',()=>{
 const s=widgetSnapshot({...base,entries:[lecture('2026-10-21T08:00Z','2026-10-21T10:00Z')]});
 expect(widgetDayState(s,new Date('2026-10-21T09:59:59Z'))).toBe('scheduled');
 expect(widgetDayState(s,new Date('2026-10-21T10:00Z'))).toBe('finished');
});
it('uses Berlin days across DST and filters holidays',()=>{
 const s=widgetSnapshot({...base,fullCourse:true,now:new Date('2026-10-24T22:30Z'),entries:[{...lecture('2026-10-24T22:15Z','2026-10-24T23:15Z'),type:'holiday'}]});
 expect(s.days[0].date).toBe('2026-10-25');expect(s.days[1].date).toBe('2026-10-26');expect(s.days[0].events).toEqual([]);
});
it('sorts events and skips invalid durations',()=>{
 const s=widgetSnapshot({...base,entries:[lecture('2026-10-21T12:00Z','2026-10-21T14:00Z','B'),lecture('2026-10-21T08:00Z','2026-10-21T10:00Z','A'),lecture('2026-10-21T12:00Z','2026-10-21T11:00Z')]});
 expect(s.days[0].events.map(e=>e.title)).toEqual(['A','B']);
});
it('opens the day and profile from a widget link',()=>{
 expect(parseWidgetLink('dhbwplanner://day?date=2026-10-21&profile=kurs%20a')).toEqual({date:'2026-10-21',profileId:'kurs a'});
 expect(parseWidgetLink('dhbwplanner://support')).toBe('support');
});
it.each(['https://day?date=2026-10-21','dhbwplanner://day?date=2026-02-31','dhbwplanner://day?date=not-a-day','dhbwplanner://unknown','javascript:alert(1)'])('rejects invalid widget links: %s',url=>{expect(parseWidgetLink(url)).toBeNull();});

it('omits the course label for manual Rapla, even if stale guided metadata exists',()=>{
 expect(widgetCourseLabel({scheduleSource:'rapla',apiSelection:null})).toBe('');
 expect(widgetCourseLabel({scheduleSource:'rapla',apiSelection:{site:'RV',degree:'BWL',course:'OLD'}})).toBe('');
 expect(widgetCourseLabel({scheduleSource:'dhbw-api',apiSelection:{site:'RV',degree:'BWL',course:' RV-WMKMM24B '}})).toBe('RV-WMKMM24B');
 expect(widgetCourseLabel({scheduleSource:'dhbw-api',apiSelection:null})).toBe('');
});
it('keeps manual Rapla lectures and deep links without a course name or room',()=>{
 const s=widgetSnapshot({...base,course:'  ',entries:[{...lecture('2026-10-21T08:00Z','2026-10-21T10:00Z'),rooms:[' ', '']}]});
 expect(s.course).toBe('');expect(s.days[0].events[0].room).toBe('');
 expect(s.days[0].events[0].title).toBe('Medienwirtschaft');
 expect(widgetDayState(s,base.now)).toBe('scheduled');
 expect(parseWidgetLink(`dhbwplanner://day?date=${s.days[0].date}&profile=${s.profileId}`)).toEqual({date:'2026-10-21',profileId:'primary'});
});
