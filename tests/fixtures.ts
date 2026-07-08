/**
 * HTML-Fixtures nach der am Live-System verifizierten Rapla-2.0-Struktur:
 * kein tooltip/infotable mehr — Termine sind <td class="week_block"> mit
 * <a> (Zeit + Titel), <span class="person"> und <span class="resource">.
 *
 * Grid der Wochentabelle: Spalte 0 = Uhrzeiten, je Tag 3 Spalten
 * (Mo 1–3, Di 4–6, Mi 7–9, Do 10–12, Fr 13–15), row-/colspans wie im Original.
 */

const YEAR_SELECT = `
<form action="/rapla/internal_calendar" method="get">
  <select name="day"><option>1</option><option selected="">6</option></select>
  <select name="month"><option>6</option><option selected="">7</option></select>
  <select name="year"><option>2024</option><option>2025</option><option selected="">2026</option></select>
</form>`;

/** Einzel-Person + Kurscode + 1 Raum; Anker mit Zusatz in spitzen Klammern. */
const BLOCK_ONLINEMARKETING = `
<td class="week_block" valign="top" rowspan="2" colspan="3" style="background-color:#f3f3f3;">
  <a href="#1">08:30 -12:30 Onlinemarketing &lt;Maximilian Zorg&gt;<br></a>
  <br>
  <span class="person">Maximilian Zorg</span><br>
  <span class="resource">DH-WINF24A</span><br>
  <span class="resource">WS17-0.13 Hörsaal</span>
</td>`;

/** Mehr-Personen-Fall: Gregor Hopf + Simone Besemer. */
const BLOCK_GELD_UND_WAEHRUNG = `
<td class="week_block" valign="top" rowspan="1" colspan="3">
  <a href="#2">09:00 -12:15 Geld und Währung<br></a>
  <br>
  <span class="person">Gregor Hopf</span><br>
  <span class="person">Simone Besemer</span><br>
  <span class="resource">DH-WINF24A</span><br>
  <span class="resource">WS17-0.13 Hörsaal</span>
</td>`;

/** Ohne Person (gültig!), ohne Raum — z. B. Klausurvorbereitung. */
const BLOCK_KLAUSURVORBEREITUNG = `
<td class="week_block" valign="top" rowspan="1" colspan="3">
  <a href="#3">10:00 -11:00 Klausur- Portfoliovorbereitung<br></a>
  <br>
  <span class="resource">DH-WINF24A</span>
</td>`;

/** Mehrere Räume. */
const BLOCK_MEDIAPLANUNG = `
<td class="week_block" valign="top" rowspan="1" colspan="3">
  <a href="#4">14:00 -15:30 Mediaplanung<br></a>
  <br>
  <span class="person">Thomas Schumann</span><br>
  <span class="resource">DH-WINF24A</span><br>
  <span class="resource">WS17-0.13 Hörsaal</span><br>
  <span class="resource">WS17-0.15 Seminarraum</span>
</td>`;

/** Fallback-Fall: nur der Anker, keine person-/resource-Spans. */
const BLOCK_SELBSTSTUDIUM = `
<td class="week_block" valign="top" rowspan="3" colspan="3">
  <a href="#5">08:30 -10:00 Selbststudium<br></a>
</td>`;

/** Am Live-System beobachtet: Block ohne Endzeit (Deadline) → Punkt-Termin. */
const BLOCK_DEADLINE = `
<td class="week_block" valign="top" rowspan="1" colspan="3">
  <a href="#6">00:00 -Deadline Wahl Studienrichtungswahlfach II<br></a>
</td>`;

export const WEEK_FIXTURE = `<!DOCTYPE html>
<html><head><title>DHBW</title></head><body>
${YEAR_SELECT}
<table class="week_table">
<tr>
  <td class="week_number">KW 28</td>
  <th class="week_header" colspan="3"><nobr>Mo 06.07.</nobr></th>
  <th class="week_header" colspan="3"><nobr>Di 07.07.</nobr></th>
  <th class="week_header" colspan="3"><nobr>Mi 08.07.</nobr></th>
  <th class="week_header" colspan="3"><nobr>Do 09.07.</nobr></th>
  <th class="week_header" colspan="3"><nobr>Fr 10.07.</nobr></th>
</tr>
<tr>
  <td class="week_times" rowspan="1">08:00</td>
  ${BLOCK_ONLINEMARKETING}
  ${BLOCK_GELD_UND_WAEHRUNG}
  <td class="week_emptycell" colspan="3">&nbsp;</td>
  <td class="week_emptycell" colspan="3">&nbsp;</td>
  ${BLOCK_SELBSTSTUDIUM}
</tr>
<tr>
  <td class="week_times" rowspan="1">10:00</td>
  ${BLOCK_MEDIAPLANUNG}
  ${BLOCK_KLAUSURVORBEREITUNG}
  <td class="week_emptycell" colspan="3">&nbsp;</td>
</tr>
<tr>
  <td class="week_times" rowspan="1">14:00</td>
  <td class="week_emptycell" colspan="3">&nbsp;</td>
  <td class="week_emptycell" colspan="3">&nbsp;</td>
  <td class="week_emptycell" colspan="3">&nbsp;</td>
  ${BLOCK_DEADLINE}
</tr>
</table>
</body></html>`;

/** Gültige, aber leere Woche (nur Kopfzeile, keine Blöcke). */
export const EMPTY_WEEK_FIXTURE = `<!DOCTYPE html>
<html><body>
${YEAR_SELECT}
<table class="week_table">
<tr>
  <td class="week_number">KW 32</td>
  <th class="week_header" colspan="3"><nobr>Mo 03.08.</nobr></th>
  <th class="week_header" colspan="3"><nobr>Di 04.08.</nobr></th>
</tr>
</table>
</body></html>`;

/** Kaputte Seite ohne Jahres-Selektor. */
export const NO_YEAR_FIXTURE = `<!DOCTYPE html>
<html><body><table class="week_table"><tr><td class="week_number">KW 1</td></tr></table></body></html>`;
