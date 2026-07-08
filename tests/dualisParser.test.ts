import { describe, expect, it } from 'vitest';
import {
  extractAccessToken,
  extractRedirectUrl,
  extractRefreshUrl,
  parseExams,
  parseMainPageUrls,
  parseModules,
  parseSemesterOptions,
  parseStudySummary,
  replaceAccessToken,
  withSemesterArgument,
} from '../src/dualis/parser';

const MAIN_PAGE = `
<html><body>
  <a class="link000307" href="/scripts/mgrqispi.dll?APPNAME=CampusNet&PRGNAME=COURSERESULTS&ARGUMENTS=-N111111111111111">Kurse</a>
  <a class="link000310" href="/scripts/mgrqispi.dll?APPNAME=CampusNet&PRGNAME=STUDENT_RESULT&ARGUMENTS=-N111111111111111">Pruefungen</a>
  <a class="link000031" href="/scripts/mgrqispi.dll?APPNAME=CampusNet&PRGNAME=SCHEDULE&ARGUMENTS=-N111111111111111">Plan</a>
  <a id="logoutButton" href="/scripts/mgrqispi.dll?APPNAME=CampusNet&PRGNAME=LOGOUT&ARGUMENTS=-N111111111111111">Logout</a>
</body></html>`;

const STUDY_RESULTS = `
<html><body>
  <table><tbody>
    <tr><td>irrelevant</td><td></td><td></td></tr>
    <tr><td>Summe</td><td></td><td>82,5</td></tr>
    <tr><td>Benotete Credits: 210,0</td><td></td><td></td></tr>
  </tbody></table>
  <table><tbody>
    <tr><th>GPA gesamt</th><th>2,1</th></tr>
    <tr><th>GPA Hauptmodule</th><th>1,9</th></tr>
  </tbody></table>
  <table><tbody>
    <tr class="subhead level00">
      <td colspan="2">ZZZ_RV-W Informatik WI Muster_bis2025</td>
      <td></td><td></td><td></td><td></td>
    </tr>
    <tr class="subhead level01">
      <td colspan="2">Module</td>
      <td></td><td></td><td></td><td></td>
    </tr>
    <tr>
      <td class="tbdata">T3INF1001</td>
      <td class="tbdata"><a href="#x">Programmieren</a><script><!-- var PopupLink=document.getElementById('result_id_391944101827516');PopupLink.href='#391944101827516'; //--></script></td>
      <td class="tbdata">&nbsp;</td>
      <td class="tbdata">  5,0</td>
      <td class="tbdata">1,7</td>
      <td class="tbdata"><img src="/img/individual/pass.gif" alt="Bestanden" title="Bestanden" /></td>
    </tr>
    <tr>
      <td class="tbdata">T3INF1002</td>
      <td class="tbdata">Datenbanken</td>
      <td class="tbdata">&nbsp;</td>
      <td class="tbdata">  5,0</td>
      <td class="tbdata">&nbsp;</td>
      <td class="tbdata"><img src="/img/individual/open.gif" alt="Offen" title="Offen" /></td>
    </tr>
    <tr>
      <td class="tbdata">Summe Schlüsselqualifikationen</td>
      <td class="tbdata"></td>
      <td class="tbdata">&nbsp;</td>
      <td class="tbdata">  5,0</td>
      <td class="tbdata">&nbsp;</td>
      <td class="tbdata"></td>
    </tr>
  </tbody></table>
</body></html>`;

const COURSE_RESULTS = `
<html><body>
  <select id="semester" name="semester" onchange="reloadpage.createUrlAndReload('/scripts/mgrqispi.dll','CampusNet','COURSERESULTS','123456789876543','000307','-N'+this.value);">
    <option value="20241">1. Semester</option>
    <option value="20242">2. Semester</option>
  </select>
  <table><tbody>
    <tr>
      <td>T3INF1001</td>
      <td>Programmieren</td>
      <td>1,7</td>
      <td>5,0</td>
      <td>bestanden</td>
      <td><button onclick='dl_popUp("/scripts/mgrqispi.dll?APPNAME=CampusNet&PRGNAME=DETAILS&ARGUMENTS=-N111111111111111")'>Details</button></td>
    </tr>
  </tbody></table>
</body></html>`;

const MODULE_DETAILS = `
<html><body>
  <table><tbody>
    <tr><td class="level01">1. Versuch</td></tr>
    <tr><td class="level02">Programmieren</td></tr>
    <tr>
      <td class="tbdata">2024/25</td>
      <td class="tbdata">Klausur</td>
      <td class="tbdata">schriftlich</td>
      <td class="tbdata">1,7</td>
    </tr>
    <tr>
      <td class="tbdata">T3INF1001.1</td>
      <td class="tbdata">Programmieren Grundlagen</td>
      <td class="tbdata"></td>
      <td class="tbdata">&nbsp;</td>
    </tr>
  </tbody></table>
</body></html>`;

describe('Dualis parser', () => {
  it('liest Token und ersetzt alte Token in URLs', () => {
    const url = 'https://dualis.dhbw.de/scripts/mgrqispi.dll?ARGUMENTS=-N123456789012345';
    expect(extractAccessToken(url)).toBe('123456789012345');
    expect(replaceAccessToken(url, '999999999999999')).toContain('ARGUMENTS=-N999999999999999');
  });

  it('liest Refresh- und HTML-Redirects absolut', () => {
    expect(extractRefreshUrl('0; URL=/scripts/mgrqispi.dll?foo=1')).toBe(
      'https://dualis.dhbw.de/scripts/mgrqispi.dll?foo=1',
    );
    expect(extractRedirectUrl(`<meta http-equiv="refresh" content="0;url=/scripts/start">`)).toBe(
      'https://dualis.dhbw.de/scripts/start',
    );
  });

  it('extrahiert die wichtigen Hauptseiten-URLs', () => {
    const urls = parseMainPageUrls(MAIN_PAGE);
    expect(urls.courseResults).toContain('COURSERESULTS');
    expect(urls.studentResults).toContain('STUDENT_RESULT');
    expect(urls.monthlySchedule).toContain('SCHEDULE');
    expect(urls.logout).toContain('LOGOUT');
  });

  it('liest Notenübersicht und Credits', () => {
    expect(parseStudySummary(STUDY_RESULTS)).toEqual({
      gpaTotal: 2.1,
      gpaMainModules: 1.9,
      creditsGained: 82.5,
      creditsTotal: 210,
    });
  });

  it('liest Module aus der Leistungsübersicht (student-Layout) und filtert Nicht-Module', () => {
    const modules = parseModules(STUDY_RESULTS, 'student');
    // ZZZ-Programmknoten, "Module"-Gruppe und "Summe …" sind keine Module.
    expect(modules).toHaveLength(2);
    expect(modules[0]).toMatchObject({
      id: 'T3INF1001',
      name: 'Programmieren',
      grade: '1,7',
      credits: '5,0',
      passed: true,
    });
    // Offenes Modul: Note leer, Status-Bild ist kein pass.gif → nicht bestanden.
    expect(modules[1]).toMatchObject({ id: 'T3INF1002', grade: '', passed: false });
  });

  it('liest Kursnoten (course-Layout) mit Note in Spalte 3 und Detail-Link', () => {
    const modules = parseModules(COURSE_RESULTS, 'course');
    expect(modules).toHaveLength(1);
    expect(modules[0]).toMatchObject({ id: 'T3INF1001', grade: '1,7', credits: '5,0', passed: true });
    expect(modules[0].detailsUrl).toContain('DETAILS');
  });

  it('liest Semester-Optionen (Name + value)', () => {
    expect(parseSemesterOptions(COURSE_RESULTS)).toEqual([
      { name: '1. Semester', value: '20241' },
      { name: '2. Semester', value: '20242' },
    ]);
  });

  it('setzt den Semesterwert ins dritte ARGUMENTS-Feld (Kommas bleiben unkodiert)', () => {
    const base =
      'https://dualis.dhbw.de/scripts/mgrqispi.dll?APPNAME=CampusNet&PRGNAME=COURSERESULTS&ARGUMENTS=-N905692606601518,-N000307,';
    const url = withSemesterArgument(base, '20241');
    expect(url).toBe(
      'https://dualis.dhbw.de/scripts/mgrqispi.dll?APPNAME=CampusNet&PRGNAME=COURSERESULTS&ARGUMENTS=-N905692606601518,-N000307,-N20241',
    );
  });

  it('überschreibt ein bereits gesetztes Semesterfeld statt zu duplizieren', () => {
    const base =
      'https://dualis.dhbw.de/scripts/mgrqispi.dll?PRGNAME=COURSERESULTS&ARGUMENTS=-N111,-N000307,-N20241&clino=111';
    expect(withSemesterArgument(base, '20242')).toContain('ARGUMENTS=-N111,-N000307,-N20242&clino=111');
  });

  it('liest Prüfungen aus Moduldetails', () => {
    expect(parseExams(MODULE_DETAILS)).toEqual([
      {
        attempt: '1. Versuch',
        moduleName: 'Programmieren',
        semester: '2024/25',
        name: 'Klausur',
        grade: '1,7',
      },
    ]);
  });
});
