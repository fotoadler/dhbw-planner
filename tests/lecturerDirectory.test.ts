import { describe, expect, it } from 'vitest';
import { ScheduleEntry } from '../src/types';
import {
  applyLecturerDirectory,
  updateLecturerDirectory,
} from '../src/store/lecturerDirectory';

function entry(partial: Partial<ScheduleEntry> & { title: string }): ScheduleEntry {
  return {
    start: new Date('2026-07-06T08:30:00Z'),
    end: new Date('2026-07-06T12:30:00Z'),
    extra: undefined,
    lecturers: [],
    course: 'DH-WINF24A',
    rooms: [],
    type: 'lecture',
    ...partial,
  };
}

describe('lecturer directory', () => {
  it('merkt sich Dozenten aus im-Netz geladenen Terminen', () => {
    const { directory, changed } = updateLecturerDirectory({}, [
      entry({ title: 'Onlinemarketing', lecturers: ['Maximilian Zorg'] }),
    ]);
    expect(changed).toBe(true);
    expect(directory).toEqual({ onlinemarketing: ['Maximilian Zorg'] });
  });

  it('ignoriert Termine ohne Dozenten (Abruf von außerhalb)', () => {
    const { directory, changed } = updateLecturerDirectory({}, [
      entry({ title: 'Onlinemarketing', lecturers: [] }),
    ]);
    expect(changed).toBe(false);
    expect(directory).toEqual({});
  });

  it('meldet keine Änderung, wenn der Dozent identisch bleibt', () => {
    const start = { onlinemarketing: ['Maximilian Zorg'] };
    const { changed } = updateLecturerDirectory(start, [
      entry({ title: 'Onlinemarketing', lecturers: ['Maximilian Zorg'] }),
    ]);
    expect(changed).toBe(false);
  });

  it('aktualisiert auf den zuletzt gesehenen Dozenten', () => {
    const start = { onlinemarketing: ['Alt Dozent'] };
    const { directory, changed } = updateLecturerDirectory(start, [
      entry({ title: 'Onlinemarketing', lecturers: ['Neu Dozent'] }),
    ]);
    expect(changed).toBe(true);
    expect(directory).toEqual({ onlinemarketing: ['Neu Dozent'] });
  });

  it('ergänzt fehlende Dozenten aus dem Verzeichnis', () => {
    const dir = { onlinemarketing: ['Maximilian Zorg'] };
    const [filled] = applyLecturerDirectory(
      [entry({ title: 'Onlinemarketing', lecturers: [] })],
      dir,
    );
    expect(filled.lecturers).toEqual(['Maximilian Zorg']);
  });

  it('überschreibt echte (frische) Dozenten nicht', () => {
    const dir = { onlinemarketing: ['Verzeichnis Dozent'] };
    const [filled] = applyLecturerDirectory(
      [entry({ title: 'Onlinemarketing', lecturers: ['Echter Dozent'] })],
      dir,
    );
    expect(filled.lecturers).toEqual(['Echter Dozent']);
  });

  it('verknüpft eine verschobene Vorlesung mit demselben Titel', () => {
    const dir = { onlinemarketing: ['Maximilian Zorg'] };
    // Sekretariat verschiebt die Vorlesung → neuer Termin, kein Dozent (extern).
    const moved = entry({
      title: 'Onlinemarketing',
      lecturers: [],
      start: new Date('2026-07-13T08:30:00Z'),
      end: new Date('2026-07-13T12:30:00Z'),
    });
    const [filled] = applyLecturerDirectory([moved], dir);
    expect(filled.lecturers).toEqual(['Maximilian Zorg']);
  });
});
