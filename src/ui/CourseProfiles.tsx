import { useEffect, useRef } from 'react';
import { makePrimaryProfile, removeCourseProfile } from '../store/courseProfiles';
import type { AppSettings } from '../store/preferences';

interface Props {
  settings: AppSettings;
  onChange: (settings: AppSettings) => void;
  onAdd: () => void;
  managing: boolean;
  onManage: (open: boolean) => void;
}

export function CourseProfiles({ settings, onChange, onAdd, managing, onManage }: Props) {
  const profiles = settings.courseProfiles ?? [];
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const popup = dialog.current;
    if (!popup) return;
    if (!managing) { if (popup.open) popup.close(); return; }
    const position = () => {
      const anchor = trigger.current?.getBoundingClientRect();
      if (!anchor) return;
      const width = Math.min(300, window.innerWidth - 32);
      popup.style.left = `${Math.max(16, Math.min(anchor.right - width, window.innerWidth - width - 16))}px`;
      popup.style.top = `${anchor.bottom + 8}px`;
      popup.style.maxHeight = `${Math.max(120, window.innerHeight - anchor.bottom - 24)}px`;
    };
    position();
    popup.showModal();
    window.addEventListener('resize', position);
    return () => window.removeEventListener('resize', position);
  }, [managing]);

  return <>
    <button ref={trigger} type="button" className="iconbtn" aria-label="Kursprofile"
      aria-haspopup="dialog" aria-expanded={managing} onClick={() => onManage(!managing)}>
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="13" height="13" rx="2" />
        <path d="M8 16v3a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-3M6 7h7M6 11h4" />
      </svg>
    </button>
    <dialog className="course-profiles-popup" ref={dialog} onCancel={() => onManage(false)} aria-label="Kursprofile"
      onClick={event => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onManage(false);
      }}>
      {profiles.map(profile => {
        const selected = profile.id === (settings.viewedProfileId ?? settings.primaryProfileId);
        const site = profile.apiSelection?.site;
        const course = profile.apiSelection?.course ?? profile.rapla?.file ?? 'Rapla';
        const shortCourse = site && course.startsWith(`${site}-`) ? course.slice(site.length + 1) : course;
        const primary = profile.id === settings.primaryProfileId;
        return <div className="course-profiles-popup__row" key={profile.id}><button type="button" className="course-profiles-popup__course" aria-pressed={selected}
          onClick={() => { onChange({ ...settings, viewedProfileId: profile.id }); onManage(false); }}>
          {site && <span className="course-profiles-popup__site">{site}</span>}
          <span className="course-profiles-popup__label">{shortCourse}{primary && <small>Hauptprofil</small>}</span>
          {selected && <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>}
        </button>
          <button type="button" className="course-profiles-popup__action" aria-label={primary ? `${course} ist Hauptprofil` : `${course} als Hauptprofil festlegen`}
            title={primary ? 'Hauptprofil' : 'Als Hauptprofil festlegen'} aria-pressed={primary}
            onClick={() => { if (!primary) onChange(makePrimaryProfile(settings, profile.id)); }}>
            <svg viewBox="0 0 24 24" width="17" height="17" fill={primary ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" aria-hidden="true"><path d="m12 3 2.8 5.7 6.3.9-4.6 4.5 1.1 6.3-5.6-3-5.6 3 1.1-6.3L3 9.6l6.2-.9Z" /></svg>
          </button>
          <button type="button" className="course-profiles-popup__action" aria-label={`${course} löschen`} disabled={primary}
            title={primary ? 'Zum Löschen zuerst ein anderes Hauptprofil festlegen' : 'Profil löschen'}
            onClick={() => onChange(removeCourseProfile(settings, profile.id))}>
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5" /></svg>
          </button>
        </div>;
      })}
      <button type="button" className="course-profiles-popup__add" onClick={() => { onManage(false); onAdd(); }}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
        Profil erstellen
      </button>
    </dialog>
  </>;
}
