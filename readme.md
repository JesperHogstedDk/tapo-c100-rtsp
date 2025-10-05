
# 📸 Tapo RTSP Motion Detection

Et TypeScript‑projekt til bevægelsesdetektering og snapshots fra TP‑Link Tapo C100 (eller andre RTSP‑kompatible kameraer).  
Projektet bruger low‑res streamen til at opdage bevægelse og tager et high‑res snapshot først, når bevægelsen er ophørt i en given periode.

## ✨ Funktioner

- Motion detection via low‑res RTSP stream (`stream2`).
- High‑res snapshots fra high‑res stream (`stream1`) – kun når der har været ro i X sekunder.
- Snapshots gemmes i mapper pr. dato (`snapshots/YYYY-MM-DD/HH-MM-SS.jpg`).
- Indbygget Express webserver med:
  - `/latest` → returnerer det nyeste snapshot.
  - `/photos` → galleri med alle snapshots (nyeste først, inkl. stort preview af seneste billede).
  - `/snapshots/...` → direkte adgang til filerne.
- Konfigurerbar ro‑periode via miljøvariabel (`CALM_PERIOD`).
- Automatisk oprydning af gamle billeder (kan udvides efter behov).

## 📦 Installation

Klon projektet og installer afhængigheder:

```bash
git clone https://github.com/<dit-repo>/tapo-rtsp-motion.git
cd tapo-rtsp-motion
npm install
```

## ⚙️ Miljøvariabler

Opret en `.env` fil i projektets rodmappe med:

```env
CAMERA_IP=192.168.1.50
USRNAME=admin
PASSWORD=dit_kodeord
CALM_PERIOD=10
PORT=10000
```

- `CAMERA_IP` → IP‑adresse til dit Tapo‑kamera.
- `USRNAME` / `PASSWORD` → login til kameraets RTSP‑stream.
- `CALM_PERIOD` → antal sekunder med ro, før der tages et high‑res snapshot (default = 10).
- `PORT` → port til webserveren (default = 10000).

## 🚀 Kørsel

### Udvikling (uden build)
```bash
npm run start:dev
```

### Produktion (med build)
```bash
npm start
```

## 🌐 Webinterface

Når serveren kører, kan du åbne:

- `http://localhost:10000/` → status.
- `http://localhost:10000/latest` → seneste snapshot (cache‑bustet).
- `http://localhost:10000/photos` → galleri med alle billeder.
- `http://localhost:10000/snapshots/...` → direkte adgang til filer.

## 📂 Projektstruktur

```
src/
 ├─ motion-capture.ts   # Hovedprogrammet
snapshots/              # Gemte billeder (oprettes automatisk)
dist/                   # Transpileret JS (efter build)
```

## 🔧 Scripts

- `npm run start:dev` → kør direkte med ts-node (udvikling).
- `npm run build` → transpiler TypeScript til `dist/`.
- `npm start` → build + kør transpileret kode.
- `npm run checkAccess` → test at kameraet kan tilgås.

## 🛠️ Teknologi

- TypeScript
- Express
- fluent-ffmpeg
- ffmpeg (installeres via `@ffmpeg-installer/ffmpeg`)
- dotenv

## 🔄 Flowdiagram

```text
        ┌───────────────┐
        │   RTSP Low    │
        │   (stream2)   │
        └───────┬───────┘
                │
                ▼
        ┌───────────────┐
        │ Motion detect │
        └───────┬───────┘
                │ bevægelse
                ▼
        ┌───────────────┐
        │ Vent på ro    │
        │ (CALM_PERIOD) │
        └───────┬───────┘
                │ ro
                ▼
        ┌───────────────┐
        │   RTSP High   │
        │   (stream1)   │
        └───────┬───────┘
                │
                ▼
        ┌───────────────┐
        │ Gem snapshot  │
        │   (dato/tid)  │
        └───────┬───────┘
                │
                ▼
        ┌───────────────┐
        │   Webserver   │
        │ /latest /photos
        └───────────────┘
```

## 🐞 Fejlfinding

### Error: Output stream closed
- Ses typisk når ffmpeg lukker sin pipe for hurtigt.
- Sørg for at `grabFrame` bruger `.format("image2pipe")` og samler bytes i hukommelsen.
- Hvis problemet fortsætter i dit miljø, kan du falde tilbage til at skrive til en midlertidig fil og læse den ind.

### Error: ffmpeg exited with code 1
- Kan skyldes forkerte output‑indstillinger (fx `-update 1` til JPEG).
- Brug i stedet `frames(1)` og `image2pipe` til at hente ét billede ad gangen.

### Ingen billeder i /photos
- Tjek at `.env` har korrekte `CAMERA_IP`, `USRNAME`, `PASSWORD`.
- Sørg for at kameraets RTSP‑stream er aktiveret i Tapo‑appen.

### Browser viser gammelt billede
- Brug query‑parametre (`?t=timestamp`) for at cache‑buste.
- `/latest` route sætter `Cache-Control: no-store`, men nogle proxies kan stadig cache.

## 💡 Tips

- Brug low‑res streamen til motion detection for at spare CPU.
- Brug high‑res streamen kun når du vil gemme billeder.
- Justér `CALM_PERIOD` for at bestemme hvor længe der skal være ro, før billedet tages.
- Hvis du vil køre flere instanser, bør du bruge delt storage (fx S3 eller Azure Blob).

## 📜 Licens

MIT – brug frit og tilpas efter behov.

## Genstart med crontab 
Åbn crontab
```bash
crontab -e
```
- Tryk i for at gå i insert mode (du kan nu skrive).
- Indsæt linjen:
```bash
@reboot /usr/bin/env bash -c 'cd /var/www/hogsted.dk/public_html/TapoC100 && npx pm2 resurrect'  
eller  
@reboot /usr/bin/env bash -c 'cd /var/www/hogsted.dk/public_html/TapoC100 && npx pm2 resurrect >> /var/www/hogsted.dk/public_html/TapoC100/cron-startup.log 2>&1'
```
- Tryk Esc for at afslutte insert mode.
- Skriv :wq og tryk Enter for at gemme og lukke.


Test om crontab blev gemt  
Kør:
```bash
crontab -l
```
Du bør se:  
@reboot /usr/bin/env bash -c 'cd /var/www/hogsted.dk/public_html/TapoC100 && npx pm2 resurrect'  
eller  
@reboot /usr/bin/env bash -c 'cd /var/www/hogsted.dk/public_html/TapoC100 && npx pm2 resurrect >> /var/www/hogsted.dk/public_html/TapoC100/cron-startup.log 2>&1'  
afslut med  
:qa