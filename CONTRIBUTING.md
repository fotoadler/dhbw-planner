# Contributing

Danke für dein Interesse an DHBW Planner.

## Entwicklung

```bash
npm install
npm test
npm run build
```

Bitte halte Änderungen fokussiert und ergänze Tests, wenn Parser, Zeitlogik, Notifications, Dualis-Auswertung oder ICS-Export betroffen sind.

## Branch- und CI-Workflow

Arbeite für Änderungen in einem eigenen Branch und reiche sie als Pull Request gegen `main` ein. Der öffentliche `main`-Branch ist geschützt; direkte Änderungen, Force-Pushes und das Löschen des Branches sind nicht vorgesehen. Vor dem Zusammenführen muss der GitHub-Actions-Check `web-quality` erfolgreich sein. Er führt `npm ci`, `npm test` und `npm run build` aus.

Der App-Review-Demomodus ist absichtlich transparent und nicht als geheimer Zugang gedacht. Seine öffentlichen Testwerte schalten nur lokale Beispieldaten frei; Details stehen in [docs/APP_REVIEW_DEMO.md](docs/APP_REVIEW_DEMO.md). Änderungen daran bitte zusammen mit Tests und Dokumentation einreichen.

## Pull Requests

- Beschreibe kurz das Problem und die Lösung.
- Verlinke relevante Issues, wenn vorhanden.
- Führe `npm test` und `npm run build` aus.
- Beschreibe bei Änderungen an API, Datenschutz oder Speicherung auch die Auswirkungen auf die passende Dokumentation.
- Committe keine lokalen Credentials, Signaturdateien, Build-Artefakte oder generierten Capacitor-Web-Assets.

## Code-Stil

Das Projekt verwendet TypeScript, React und Vitest. Bitte bestehende Muster beibehalten und keine neuen Frameworks einführen, wenn sie für die Änderung nicht nötig sind.
