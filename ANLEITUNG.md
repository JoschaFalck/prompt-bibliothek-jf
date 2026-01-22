# Deployment-Anleitung: Prompt-Bibliothek

## Schritt 1: Netlify Account

Falls noch nicht vorhanden:
1. Gehe zu [netlify.com](https://www.netlify.com)
2. Klicke auf "Sign up"
3. Registriere dich (z.B. mit GitHub oder E-Mail)

## Schritt 2: Projekt hochladen

### Option A: Drag & Drop (am einfachsten)

1. Gehe zu [app.netlify.com](https://app.netlify.com)
2. Scrolle nach unten zu "Want to deploy a new site without connecting to Git?"
3. Ziehe den kompletten Ordner `prompt-bibliothek` in das Upload-Feld
4. Warte, bis das Deployment fertig ist

### Option B: Über GitHub (für spätere Updates)

1. Lade den Ordner in ein GitHub-Repository hoch
2. In Netlify: "Add new site" → "Import an existing project"
3. Verbinde mit GitHub und wähle das Repository
4. Deploy-Einstellungen bleiben wie vorgeschlagen
5. Klicke "Deploy site"

## Schritt 3: Domain anpassen

1. Nach dem Deployment siehst du eine zufällige URL wie `random-name-123.netlify.app`
2. Klicke auf "Site settings" → "Change site name"
3. Ändere zu deinem Wunschnamen: `meine-prompts-jf`
4. Deine URL ist nun: `meine-prompts-jf.netlify.app`

## Schritt 4: Testen

1. Öffne deine neue URL im Browser
2. Erstelle einen Test-Prompt
3. Klicke auf "Cloud-Backup" um in die Cloud zu speichern
4. Öffne die URL auf einem anderen Gerät
5. Klicke auf "Aus Cloud laden" – dein Prompt sollte erscheinen!

---

## Nutzung

### Prompts verwalten
- **Neuer Prompt**: Button oben rechts
- **Bearbeiten**: Stift-Symbol auf der Prompt-Karte
- **Kopieren**: Kopier-Symbol (bei Variablen öffnet sich ein Dialog)
- **Löschen**: Papierkorb-Symbol

### Cloud-Sync
- **Cloud-Backup**: Speichert alle Prompts in der Netlify Cloud
- **Aus Cloud laden**: Lädt den letzten Stand aus der Cloud

### Import/Export
- **Export JSON**: Für Backup oder Teilen der kompletten Sammlung
- **Export MD**: Markdown-Format zum Lesen/Drucken
- **Import JSON**: Lädt eine exportierte Sammlung

### Kategorien
- Klicke auf "+" neben "Kategorien" um neue anzulegen
- Klicke auf eine Kategorie um zu filtern
- Hover über eine Kategorie zeigt den Löschen-Button

### Variablen
Nutze `{{variable}}` in deinen Prompts:
```
Analysiere den folgenden {{Textart}} für {{Jahrgangsstufe}}:
```
Beim Kopieren wirst du nach den Werten gefragt.

---

## Problemlösung

### "Fehler beim Speichern in Cloud"
- Prüfe deine Internetverbindung
- Die lokale Kopie ist immer sicher

### Prompts verschwunden nach Browser-Neustart
- Klicke auf "Aus Cloud laden" um den letzten Backup-Stand zu holen

### Änderungen nicht auf anderem Gerät sichtbar
1. Auf Gerät A: "Cloud-Backup" klicken
2. Auf Gerät B: "Aus Cloud laden" klicken

---

## Technische Details

```
prompt-bibliothek/
├── index.html          # Benutzeroberfläche
├── style.css           # Design
├── app.js              # Anwendungslogik
├── netlify.toml        # Netlify-Konfiguration
├── package.json        # Abhängigkeiten
└── netlify/
    └── functions/
        └── prompts.js  # Cloud-Speicher API
```

Die Daten werden in Netlify Blobs gespeichert – einem einfachen Key-Value-Speicher, der im Free Tier kostenlos ist.
