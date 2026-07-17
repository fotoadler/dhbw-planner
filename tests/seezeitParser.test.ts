import { describe, expect, it } from 'vitest';
import { parseSeezeit } from '../src/seezeit/parser';

// Verkürzte, aber strukturgetreue Nachbildung einer Seezeit-Seite:
// Tag 1 mit zwei Gerichten, Tag 2 mit einem, plus ein leerer Platzhalterblock.
const HTML = `
<div class="tx-speiseplan">
  <div class="tabs">
    <a href="" rel="1" class="tab tab1  aktiv"><span> Mo. 13.07.</span></a>
    <a href="" rel="2" class="tab tab2 "><span> Di. 14.07.</span></a>
  </div>
  <div class="contents contents_1 contents_aktiv" id="tab1">
    <div class="speiseplanTagKat 3 25a 28">
      <div class="category">Seezeit-Teller</div>
      <div class="title_preise">
        <div class="title_preise_1">
          <div class="title">Hackbällchen <sup>(3,25a,28)</sup> mit Kartoffelpüree <sup>(31)</sup></div>
          <div class="preise">4,40 &euro; Studierende | 5,90 &euro; Mitarbeiter | 8,70 &euro; Gäste</div>
        </div>
        <div class="title_preise_2">
          <div class="speiseplanTagKatIcon B"></div><div class="speiseplanTagKatIcon Sch"></div>
        </div>
      </div>
    </div>
    <div class="speiseplanTagKat 3 25a">
      <div class="category">KombinierBar</div>
      <div class="title_preise">
        <div class="title_preise_1">
          <div class="title">Gemüsecurry mit Reis <sup>(3)</sup></div>
          <div class="preise">2,20 &euro; Studierende | 3,30 &euro; Mitarbeiter | 4,40 &euro; Gäste</div>
        </div>
        <div class="title_preise_2">
          <div class="speiseplanTagKatIcon Vegan"></div>
        </div>
      </div>
    </div>
  </div>
  <div class="contents contents_2" id="tab2">
    <div class="speiseplanTagKat 25a">
      <div class="category">Seezeit-Teller</div>
      <div class="title_preise">
        <div class="title_preise_1">
          <div class="title">Pizza Margherita <sup>(25a)</sup></div>
          <div class="preise">3,80 &euro; Studierende | 5,10 &euro; Mitarbeiter</div>
        </div>
        <div class="title_preise_2">
          <div class="speiseplanTagKatIcon Veg"></div>
        </div>
      </div>
    </div>
    <div class="speiseplanTagKat ">
      <div class="category"></div>
      <div class="title_preise"><div class="title_preise_1"><div class="title"></div></div></div>
    </div>
  </div>
</div>`;

// Als "heute" der 13.07.2026, damit das Jahr eindeutig ableitbar ist.
const TODAY = { y: 2026, m: 7, d: 13 };

describe('seezeit parser', () => {
  const plan = parseSeezeit(HTML, TODAY);

  it('ordnet Gerichte dem richtigen Kalendertag zu (Jahr aus heute)', () => {
    expect(Object.keys(plan).sort()).toEqual(['2026-07-13', '2026-07-14']);
    expect(plan['2026-07-13']).toHaveLength(2);
    expect(plan['2026-07-14']).toHaveLength(1);
  });

  it('entfernt Allergen-Hochzahlen aus dem Gerichtsnamen', () => {
    expect(plan['2026-07-13'][0].title).toBe('Hackbällchen mit Kartoffelpüree');
    expect(plan['2026-07-13'][0].category).toBe('Seezeit-Teller');
  });

  it('liest den Studierenden-Preis', () => {
    expect(plan['2026-07-13'][0].price).toBe('4,40 €');
    expect(plan['2026-07-13'][1].price).toBe('2,20 €');
  });

  it('übersetzt die Kennzeichnungs-Icons', () => {
    expect(plan['2026-07-13'][0].diet).toEqual(['Bessere Tierhaltung', 'Schwein']);
    expect(plan['2026-07-13'][1].diet).toEqual(['Vegan']);
    expect(plan['2026-07-14'][0].diet).toEqual(['Vegetarisch']);
  });

  it('überspringt leere Platzhalterblöcke', () => {
    // Tag 2 hat einen leeren Block, der nicht als Gericht auftaucht.
    expect(plan['2026-07-14'].every((m) => m.title.length > 0)).toBe(true);
  });

  it('löst manuelle Silbentrennung (-<br>) und weiche Trennstriche auf', () => {
    const shy = '­';
    const shyPlan = parseSeezeit(
      `<a rel="1" class="tab tab1"><span>Mo. 13.07.</span></a>
       <div class="contents" id="tab1"><div class="speiseplanTagKat">
         <div class="category">Sättigungs-</br>beilage</div>
         <div class="title_preise"><div class="title_preise_1">
           <div class="title">Bio${shy}Penne mit Seezeit-Teller</div></div></div></div></div>`,
      TODAY,
    );
    // Trennstrich vor Umbruch verschwindet, echter Bindestrich bleibt.
    expect(shyPlan['2026-07-13'][0].category).toBe('Sättigungsbeilage');
    expect(shyPlan['2026-07-13'][0].title).toBe('BioPenne mit Seezeit-Teller');
  });

  it('korrigiert das Jahr an der Jahresgrenze', () => {
    const janPlan = parseSeezeit(
      `<a rel="1" class="tab tab1"><span>Mo. 30.12.</span></a>
       <div class="contents" id="tab1"><div class="speiseplanTagKat"><div class="category">X</div>
       <div class="title_preise"><div class="title_preise_1"><div class="title">Test</div></div></div></div></div>`,
      { y: 2027, m: 1, d: 4 },
    );
    expect(Object.keys(janPlan)).toEqual(['2026-12-30']);
  });
});
