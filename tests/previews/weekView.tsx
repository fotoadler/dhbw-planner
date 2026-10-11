/** Local visual regression fixture; contains synthetic data only, not a production entry point. */
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { WeekView } from '../../src/ui/WeekView';
import { WeekEventSheet } from '../../src/ui/WeekEventSheet';
import type { ScheduleEntry } from '../../src/types';
import '../../src/styles.css';

const days = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11'];
function entry(day: string, start: string, end: string, title: string, room: string, type: ScheduleEntry['type'] = 'lecture'): ScheduleEntry {
  return { start: new Date(`${day}T${start}:00+02:00`), end: new Date(`${day}T${end}:00+02:00`), title, rooms: room ? [room] : [], lecturers: ['Dozent Beispiel'], type };
}
const entriesByDay = {
  [days[0]]: [entry(days[0], '09:00', '10:30', 'Datenanalyse', 'A1'), entry(days[0], '10:00', '11:30', 'Klausur Mathematik', 'B2', 'exam')],
  [days[1]]: [entry(days[1], '00:00', '23:59', 'Ganztägiger Hinweis', ''), entry(days[1], '07:00', '07:45', 'Früher Termin', 'C3'), entry(days[1], '08:30', '10:00', 'Software Engineering', 'C4')],
  [days[2]]: [entry(days[2], '09:00', '12:15', 'Web Engineering', 'D1')],
  [days[3]]: [entry(days[3], '10:00', '10:15', 'Kurzer Termin', 'D2'), entry(days[3], '10:15', '11:00', 'Direkt anschließend', 'D3')],
  [days[4]]: [entry(days[4], '09:00', '10:30', 'Klausur Informatik', 'E1', 'exam')],
};

function Preview() {
  const [height, setHeight] = useState(64);
  const [details, setDetails] = useState<{ day: string; entries: ScheduleEntry[] } | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [dark, setDark] = useState(false);
  return <div className="app">
    <header className="app__header" style={{ flexWrap: 'wrap', gap: 12 }}>
      <strong>Wochenansicht · Testfälle</strong>
      <label>Zoom <select aria-label="Stundenhöhe" value={height} onChange={(event) => setHeight(Number(event.target.value))}>
        {[40, 64, 120].map((value) => <option key={value} value={value}>{value} px</option>)}
      </select></label>
      <button onClick={() => { document.documentElement.dataset.theme = dark ? 'light' : 'dark'; setDark(!dark); }}>{dark ? 'Hell' : 'Dunkel'}</button>
    </header>
    {day ? <div className="dayview"><p>Tagesansicht {day}</p><button onClick={() => setDay(null)}>Zurück zur Woche</button></div> :
      <WeekView weekDays={days} entriesByDay={entriesByDay} today={days[0]} hourHeight={height} onHourHeightChange={setHeight}
        onSelectEntries={(key, entries) => setDetails({ day: key, entries })} onOpenDay={setDay} onSwipeWeek={() => setDetails(null)} />}
    {details && <WeekEventSheet {...details} onClose={() => setDetails(null)} onOpenDay={(key) => { setDetails(null); setDay(key); }} />}
  </div>;
}

createRoot(document.getElementById('root')!).render(<Preview />);
