export interface CalendarEvent {
  key: string; title: string; start: number; end: number; allDay: boolean;
  location: string; notes: string;
}
export interface CalendarStatus { available: boolean; permission: 'granted' | 'prompt' | 'denied'; }
export interface CalendarSyncPlugin {
  getStatus(): Promise<CalendarStatus>;
  requestAccess(): Promise<CalendarStatus>;
  sync(options: { events: CalendarEvent[]; rangeStart: number; rangeEnd: number; allowDelete: boolean }): Promise<{ count: number }>;
}
export declare const CalendarSync: CalendarSyncPlugin;
