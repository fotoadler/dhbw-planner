/** Gemeinsame Mensa-UI; Inhalt und Normalisierung kommen aus dem Standortprofil. */

import { useEffect, useMemo, useState } from 'react';
import type { DiningDay, DiningFacility, DiningLoadStatus, DiningMeal, DiningPartner, DiningSnapshot } from '../mensa/model';
import { DINING_SITE_OPTIONS, type DiningSiteProfile } from '../mensa/sites';

interface Props {
  profile: DiningSiteProfile;
  snapshot: DiningSnapshot | null;
  status: DiningLoadStatus;
  error: string | null;
  selectedDay: string;
  onSelectSite?: (site: string) => void;
}

export function MensaSection({ profile, snapshot, status, error, selectedDay, onSelectSite }: Props) {
  const facilities = snapshot?.facilities ?? [];
  const [selectedFacilityId, setSelectedFacilityId] = useState(() => facilities[0]?.id ?? profile.facilities[0]?.id ?? '');

  useEffect(() => {
    setSelectedFacilityId(facilities[0]?.id ?? profile.facilities[0]?.id ?? '');
  }, [profile.site, facilities.length]);

  if (profile.presentation === 'partner-list') {
    return <PartnerDirectory profile={profile} snapshot={snapshot} />;
  }

  const selectedFacility = facilities.find((facility) => facility.id === selectedFacilityId) ?? facilities[0];
  return (
    <section className="mensa" aria-label={`Speiseplan ${profile.label}`}>
      {profile.intro && <p className="mensa__intro">{profile.intro}</p>}
      {profile.venueScope === 'multi-site' && onSelectSite && (
        <label className="mensa__sitepicker">
          <span>Essensstandort</span>
          <select value={profile.site} onChange={(event) => onSelectSite(event.target.value)}>
            {DINING_SITE_OPTIONS.filter((option) => option.value !== 'CAS').map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      )}
      {status === 'loading' && !snapshot && <StatusCard title="Speiseplan wird geladen …" />}
      {error && <>
        <StatusCard
          tone="warning"
          title={status === 'stale' ? 'Aktualisierung fehlgeschlagen' : 'Speiseplan nicht erreichbar'}
          text={status === 'stale' ? 'Der zuletzt gespeicherte Stand bleibt sichtbar.' : error}
        />
        {profile.officialInfoUrl && <ExternalLink href={profile.officialInfoUrl} label="Offizielle Infos" compact />}
      </>}

      {facilities.length > 1 && (
        <nav className="mensa__tabs" aria-label="Einrichtung auswählen">
          {facilities.map((facility) => (
            <button
              key={facility.id}
              type="button"
              className={facility.id === selectedFacility?.id ? 'is-active' : ''}
              aria-pressed={facility.id === selectedFacility?.id}
              onClick={() => setSelectedFacilityId(facility.id)}
            >
              {facility.shortName ?? facility.name}
            </button>
          ))}
        </nav>
      )}

      {selectedFacility && (
        <FacilityView facility={selectedFacility} selectedDay={selectedDay} showName={facilities.length === 1} />
      )}
      {!selectedFacility && status !== 'loading' && (
        <>
          <StatusCard title="Noch kein Angebot eingerichtet" />
          {profile.officialInfoUrl && <ExternalLink href={profile.officialInfoUrl} label="Offizielle Infos" compact />}
        </>
      )}

      {(snapshot?.partners.length ?? 0) > 0 && (
        <details className="mensa__alternatives">
          <summary>{profile.site === 'KA' ? 'Weitere Mensen' : 'Weitere Angebote am Campus'}</summary>
          <div className="mensa__partnerlist">
            {snapshot?.partners.map((partner) => <PartnerCard partner={partner} key={partner.id} />)}
          </div>
        </details>
      )}
    </section>
  );
}

function FacilityView({
  facility,
  selectedDay,
  showName,
}: {
  facility: DiningFacility;
  selectedDay: string;
  showName: boolean;
}) {
  const day = facility.days[selectedDay];
  const period = facility.specialPeriods.find(({ from, to }) => selectedDay >= from && selectedDay <= to);
  const nextDay = useMemo(
    () => Object.values(facility.days).filter((item) => item.date > selectedDay && item.meals.length > 0).sort((a, b) => a.date.localeCompare(b.date))[0],
    [facility.days, selectedDay],
  );

  const visibleHours = facility.mealHours ?? (facility.kind === 'external-menu'
    ? facility.openingHours
    : undefined);
  const showsFacilityHead = showName || Boolean(visibleHours) || facility.kind === 'external-menu';

  return (
    <div className="mensa__facility">
      {showsFacilityHead && <div className="mensa__facilityhead">
        <div>
          {showName && <h3>{facility.name}</h3>}
          {visibleHours && <p>{visibleHours}</p>}
        </div>
        {facility.kind === 'external-menu' && facility.menuUrl && (
          <ExternalLink href={facility.menuUrl} label="Wochenplan öffnen" compact />
        )}
      </div>}

      {period && (
        <StatusCard
          tone={/(geschlossen|pause)/i.test(period.label) ? 'warning' : 'info'}
          title={period.label}
          text={[period.hours, nextDay ? `Nächstes Angebot: ${formatDate(nextDay.date)}` : ''].filter(Boolean).join(' · ')}
        />
      )}
      {facility.notice && <p className="mensa__notice">{facility.notice}</p>}
      {facility.orderUrl && <ExternalLink href={facility.orderUrl} label="Vorbestellen" button />}

      {facility.kind === 'external-menu' ? (
        <StatusCard title="Externer Wochenplan" text="Der aktuelle Plan wird von der Einrichtung selbst veröffentlicht." />
      ) : period && day?.status === 'closed' ? null : (
        <DayMenu day={day} nextDay={nextDay} />
      )}
    </div>
  );
}

function DayMenu({ day, nextDay }: { day: DiningDay | undefined; nextDay: DiningDay | undefined }) {
  if (!day) {
    return (
      <StatusCard
        title="Für diesen Tag ist noch kein Speiseplan veröffentlicht."
        text={nextDay ? `Nächstes verfügbares Angebot: ${formatDate(nextDay.date)}` : undefined}
      />
    );
  }
  if (day.status === 'closed') {
    return <StatusCard tone="warning" title="Laut Speiseplan geschlossen" text={day.statusMessage} />;
  }
  if (day.status === 'unpublished' || day.status === 'unavailable') {
    return <StatusCard title="Für diesen Tag liegt kein Angebot vor." text={nextDay ? `Nächstes Angebot: ${formatDate(nextDay.date)}` : undefined} />;
  }

  const groups = groupMeals(day.meals);
  return (
    <>
      {day.status === 'partial' && (
        <StatusCard tone="info" title="Speiseplan noch unvollständig" text="Bereits veröffentlichte Angebote werden angezeigt." />
      )}
      {groups.map(([category, meals]) => (
        <section className="mensa__group" key={category}>
          <h4>{category}</h4>
          {meals.map((meal) => <MealRow key={meal.id} meal={meal} />)}
        </section>
      ))}
    </>
  );
}

function MealRow({ meal }: { meal: DiningMeal }) {
  const hasDetails = Boolean(
    meal.englishTitle || meal.prices.employee !== undefined || meal.prices.guest !== undefined ||
    meal.allergens.length > 0 || meal.additives.length > 0 || meal.co2Grams !== undefined,
  );
  return (
    <article className="mensa__item">
      <div className="mensa__mealrow">
        <p className="mensa__meal">{meal.title}</p>
        {meal.prices.student !== undefined && (
          <span className="mensa__price">
            {formatPrice(meal.prices.student)}{meal.priceUnit === 'per-100g' ? '/100 g' : ''}
          </span>
        )}
      </div>
      {meal.dietaryLabels.length > 0 && (
        <p className="mensa__meta">{meal.dietaryLabels.map((label) => <span className="mensa__tag" key={label}>{label}</span>)}</p>
      )}
      {hasDetails && (
        <details className="mensa__details">
          <summary>Details</summary>
          {meal.englishTitle && <p>{meal.englishTitle}</p>}
          {meal.prices.employee !== undefined && <p>Beschäftigte: {formatPrice(meal.prices.employee)}{meal.priceUnit === 'per-100g' ? '/100 g' : ''}</p>}
          {meal.prices.guest !== undefined && <p>Gäste: {formatPrice(meal.prices.guest)}{meal.priceUnit === 'per-100g' ? '/100 g' : ''}</p>}
          {meal.allergens.length > 0 && <p>Allergene: {meal.allergens.join(', ')}</p>}
          {meal.additives.length > 0 && <p>Zusatzstoffe: {meal.additives.join(', ')}</p>}
          {meal.co2Grams !== undefined && <p>CO₂: {meal.co2Grams} g</p>}
        </details>
      )}
    </article>
  );
}

function PartnerDirectory({ profile, snapshot }: { profile: DiningSiteProfile; snapshot: DiningSnapshot | null }) {
  const partners = snapshot?.partners ?? profile.partners ?? [];
  const voucher = snapshot?.voucher ?? profile.voucher;
  return (
    <section className="mensa" aria-label={`Essensangebote ${profile.label}`}>
      {voucher && (
        <div className="mensa__voucher">
          <strong>Essensmarke: {formatPrice(voucher.price)} · Wert {formatPrice(voucher.value)}</strong>
          <p>{voucher.description}</p>
          <ExternalLink href={voucher.infoUrl} label="So funktionieren Essensmarken" compact />
        </div>
      )}
      <div className="mensa__partnerlist">
        {partners.map((partner) => <PartnerCard partner={partner} key={partner.id} />)}
      </div>
    </section>
  );
}

function PartnerCard({ partner }: { partner: DiningPartner }) {
  return (
    <article className="mensa__partner">
      <div className="mensa__partnercopy">
        <strong>{partner.name}</strong>
        {partner.address && <span>{partner.address}</span>}
        {partner.hours && <span>{partner.hours}</span>}
        {partner.description && <span>{partner.description}</span>}
      </div>
      {(partner.menuUrl || partner.infoUrl || partner.orderUrl) && (
        <div className="mensa__partneractions">
          {partner.menuUrl && <ExternalLink href={partner.menuUrl} label="Speiseplan" compact />}
          {partner.infoUrl && partner.infoUrl !== partner.menuUrl && (
            <ExternalLink href={partner.infoUrl} label="Website" compact />
          )}
          {partner.orderUrl && <ExternalLink href={partner.orderUrl} label="Bestellen" compact />}
        </div>
      )}
    </article>
  );
}

function StatusCard({ title, text, tone = 'info' }: { title: string; text?: string; tone?: 'info' | 'warning' }) {
  return <div className={`mensa__status mensa__status--${tone}`}><strong>{title}</strong>{text && <p>{text}</p>}</div>;
}

function ExternalLink({ href, label, compact = false, button = false }: { href: string; label: string; compact?: boolean; button?: boolean }) {
  const className = button ? 'mensa__action' : compact ? 'mensa__link mensa__link--compact' : 'mensa__link';
  return <a className={className} href={href} target="_blank" rel="noreferrer">{label} <span aria-hidden="true">↗</span></a>;
}

function groupMeals(meals: DiningMeal[]): Array<[string, DiningMeal[]]> {
  const groups = new Map<string, DiningMeal[]>();
  for (const meal of meals) groups.set(meal.category, [...(groups.get(meal.category) ?? []), meal]);
  return [...groups.entries()];
}

function formatPrice(value: number): string {
  return `${value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${date}T12:00:00`));
}
