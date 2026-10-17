import type { AppSettings } from './preferences';

export type CourseProfile = Pick<AppSettings, 'scheduleSource' | 'apiSelection' | 'raplaLink' | 'rapla' | 'hiddenModules'> & {
  id: string;
  name: string;
};

export function profileSourceKey(source: Pick<AppSettings, 'scheduleSource' | 'apiSelection' | 'rapla'>): string | undefined {
  if (source.scheduleSource === 'dhbw-api' && source.apiSelection) return `api:${source.apiSelection.site}:${source.apiSelection.course}`;
  const r = source.rapla;
  return r ? `rapla:${r.baseUrl}:${r.user ?? ''}:${r.file ?? ''}:${r.key ?? ''}:${r.salt ?? ''}` : undefined;
}

export function profileFromSettings(settings: AppSettings, id: string, name?: string): CourseProfile {
  return {
    id, name: name?.trim() || settings.apiSelection?.course || settings.rapla?.file || 'Rapla',
    scheduleSource: settings.scheduleSource, apiSelection: settings.apiSelection,
    raplaLink: settings.raplaLink, rapla: settings.rapla, hiddenModules: [...settings.hiddenModules],
  };
}

/** The existing configured plan stays the main course, including its module filters. */
export function withCourseProfiles(settings: AppSettings): AppSettings {
  if (!profileSourceKey(settings)) return settings;
  const profiles = [...(settings.courseProfiles ?? [])];
  let primary = profiles.find(p => p.id === settings.primaryProfileId);
  primary ??= profiles.find(p => profileSourceKey(p) === profileSourceKey(settings));
  const current = profileFromSettings(settings, primary?.id ?? 'primary', primary?.name);
  const next = profiles.filter(p => p.id !== current.id && profileSourceKey(p) !== profileSourceKey(current));
  next.splice(primary ? Math.min(profiles.indexOf(primary), next.length) : 0, 0, current);
  return {
    ...settings, courseProfiles: next, primaryProfileId: current.id,
    viewedProfileId: next.some(p => p.id === settings.viewedProfileId) ? settings.viewedProfileId : current.id,
  };
}

export function settingsForProfile(settings: AppSettings, profile: CourseProfile): AppSettings {
  return { ...settings, scheduleSource: profile.scheduleSource, apiSelection: profile.apiSelection,
    raplaLink: profile.raplaLink, rapla: profile.rapla, hiddenModules: profile.hiddenModules };
}

export function addCourseProfile(settings: AppSettings, source: AppSettings): AppSettings {
  const current = withCourseProfiles(settings);
  const existing = current.courseProfiles?.find(p => profileSourceKey(p) === profileSourceKey(source));
  if (existing) {
    // Completing setup again is an explicit configuration change, even for a saved course.
    const updated = profileFromSettings(source, existing.id, existing.name);
    const next = { ...current, courseProfiles: current.courseProfiles!.map(profile => profile.id === existing.id ? updated : profile), viewedProfileId: existing.id };
    return existing.id === current.primaryProfileId ? settingsForProfile(next, updated) : next;
  }
  const profile = profileFromSettings(source, crypto.randomUUID());
  return { ...current, courseProfiles: [...(current.courseProfiles ?? []), profile], viewedProfileId: profile.id };
}

export function makePrimaryProfile(settings: AppSettings, id: string): AppSettings {
  const profile = settings.courseProfiles?.find(p => p.id === id);
  if (!profile) return settings;
  return { ...settingsForProfile(settings, profile), primaryProfileId: id, viewedProfileId: id,
    ...(profile.apiSelection && settings.mensaAuto ? { mensa: profile.apiSelection.site } : {}) };
}

/** Keep the configured main course until another profile is explicitly made primary. */
export function removeCourseProfile(settings: AppSettings, id: string): AppSettings {
  const current = withCourseProfiles(settings);
  if (id === current.primaryProfileId) return current;
  return { ...current, courseProfiles: current.courseProfiles?.filter(profile => profile.id !== id),
    viewedProfileId: current.viewedProfileId === id ? current.primaryProfileId : current.viewedProfileId };
}

export function returnToPrimaryProfile(settings: AppSettings): AppSettings {
  const current = withCourseProfiles(settings);
  return { ...current, viewedProfileId: current.primaryProfileId };
}
