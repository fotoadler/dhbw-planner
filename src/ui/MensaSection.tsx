/**
 * Mensa-Speiseplan des ausgewählten Tages — unten in der Tagesansicht,
 * unterhalb des Stundenplans. Ruhige Optik in der Designsprache der App.
 */

import { MensaMeal } from '../seezeit/types';

interface Props {
  mensaLabel: string;
  meals: MensaMeal[];
}

export function MensaSection({ mensaLabel, meals }: Props) {
  if (meals.length === 0) return null;

  return (
    <section className="mensa" aria-labelledby="mensa-title">
      <h2 id="mensa-title" className="mensa__title">
        Mensa {mensaLabel}
      </h2>
      {meals.map((meal, i) => (
        <article className="mensa__item" key={`${meal.category}-${i}`}>
          <p className="mensa__cat">{meal.category}</p>
          <p className="mensa__meal">{meal.title}</p>
          {(meal.diet.length > 0 || meal.price) && (
            <p className="mensa__meta">
              {meal.diet.map((d) => (
                <span className="mensa__tag" key={d}>
                  {d}
                </span>
              ))}
              {meal.price && <span className="mensa__price">{meal.price}</span>}
            </p>
          )}
        </article>
      ))}
    </section>
  );
}
