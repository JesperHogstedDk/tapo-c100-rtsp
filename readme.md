
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

🧪 Test om det virker
Efter næste systemgenstart, tjek:  
cat /var/www/hogsted.dk/public_html/TapoC100/cron-test.log  

Du bør se noget som:  
Cron kørte: Sun Oct 6 08:00:01 CEST 2025

 Brug
- Manuelt:
./start-or-resurrect.sh
- Automatisk ved genstart: Tilføj til crontab -e:
@reboot /var/www/hogsted.dk/public_html/TapoC100/start-or-resurrect.sh




Selvfølgelig – PM2 er et rigtig nyttigt værktøj, når man vil køre Node‑programmer stabilt og uovervåget på en server. Her er en oversigt:

---

## 🔧 Hvad er PM2?
- **En procesmanager til Node.js** – den holder dine apps kørende i baggrunden, genstarter dem automatisk hvis de crasher, og giver dig kontrol over logs og ressourcer.
- **Cross‑platform** – virker på Linux, macOS og Windows.
- **Bruges ofte i produktion** – fordi den gør det nemt at køre Node‑apps som “services”.

---

## 🚀 Centrale funktioner
- **Automatisk genstart**: Hvis din app crasher, starter PM2 den igen med det samme.
- **Cluster mode**: Kan starte flere instanser af din app og udnytte alle CPU‑kerner.
- **Loghåndtering**: Samler `stdout` og `stderr` i logfiler, så du kan se hvad der sker.
- **Memory & uptime monitorering**: Du kan sætte grænser for RAM, og PM2 genstarter hvis grænsen overskrides.
- **Startup scripts**: Kan integreres med systemets init (systemd, launchd osv.), så dine apps starter automatisk ved reboot.
- **Web‑dashboard (pm2.io)**: Mulighed for at overvåge dine apps via en webgrænseflade.

---

## 📋 Typiske kommandoer
- Start en app:
  ```bash
  pm2 start app.js --name my-app
  ```
- Se status:
  ```bash
  pm2 status
  ```
- Se logs:
  ```bash
  pm2 logs my-app
  ```
- Stop eller genstart:
  ```bash
  pm2 stop my-app
  pm2 restart my-app
  ```
- Gem nuværende procesliste (så den kan genskabes efter reboot):
  ```bash
  pm2 save
  ```
- Genskab efter reboot:
  ```bash
  pm2 resurrect
  ```

---

## 🧭 Hvorfor bruge PM2 i dit projekt?
I dit tilfælde er PM2 oplagt, fordi:
- Dit kamera‑program skal køre uafbrudt og tåle fejl i netværk/ffmpeg.  
- Du vil kunne logge af serveren uden at stoppe programmet.  
- Du kan nemt se logs senere (`pm2 logs motion-capture`).  
- Du har allerede sat `@reboot pm2 resurrect` i crontab, så det starter automatisk efter genstart.

---
  
Super – her får du et færdigt **`deploy.sh`** script, som du kan køre på en frisk Ubuntu VPS for at sætte hele miljøet op (Node.js, ffmpeg, dit projekt og PM2).  

---

Perfekt 🙌 Lad os lave en lille “opskrift” på, hvordan du kan sætte dit kamera‑program op på en **Ubuntu VPS** (fx hos Hetzner, DigitalOcean, Azure, m.fl.). Så får du fuld kontrol over ffmpeg, Node og PM2 – og dermed en stabil drift.

---

## 🖥️ 1. Klargør serveren
Log ind på din VPS via SSH:
```bash
ssh user@din-server-ip
```

Opdater systemet:
```bash
sudo apt update && sudo apt upgrade -y
```

Installer de vigtigste pakker:
```bash
sudo apt install -y git curl build-essential
```

---

## 📦 2. Installer Node.js og npm
Brug NodeSource (så du får en nyere version):
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

Tjek version:
```bash
node -v
npm -v
```

---

## 🎥 3. Installer ffmpeg
Her får du en fuld build med alle codecs:
```bash
sudo apt install -y ffmpeg
```

Test:
```bash
ffmpeg -version
ffmpeg -codecs | grep mjpeg
```

---

## 📂 4. Hent dit projekt
Klon dit repo eller upload koden:
```bash
git clone https://github.com/din-bruger/tapo-c100-rtsp.git
cd tapo-c100-rtsp
npm install
```

Byg TypeScript (hvis du bruger det):
```bash
npm run build
```

---

## 🔧 5. Konfigurer miljøvariabler
Lav en `.env` i projektmappen:
```bash
nano .env
```

Indsæt fx:
```
CAMERA_IP=192.168.1.50
USRNAME=admin
PASSWORD=hemmeligt
CALM_PERIOD=10
PORT=10000
```

Gem og luk.

---

## ⚙️ 6. Installer og brug PM2
Installer globalt:
```bash
sudo npm install -g pm2
```

Start din app:
```bash
pm2 start dist/motion-capture.js --name motion-capture \
  --log-date-format="YYYY-MM-DD HH:mm:ss" \
  --max-memory-restart 512M
```

Gem processen, så den starter efter reboot:
```bash
pm2 save
pm2 startup systemd
```
Kopier den linje PM2 giver dig og kør den (fx `sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u user --hp /home/user`).

---

## 📜 7. Logs og overvågning
Se live logs:
```bash
pm2 logs motion-capture
```

Se status:
```bash
pm2 status
```

Stop/genstart:
```bash
pm2 restart motion-capture
pm2 stop motion-capture
```

---

## 🌐 8. Tilgå webserveren
Åbn i browser:
```
http://din-server-ip:10000
```
- `/latest` → seneste snapshot  
- `/photos` → galleri  

---

### ✅ Resultat
- Du har nu en **robust opsætning**: Node + ffmpeg + PM2 på en VPS.  
- Programmet starter automatisk efter reboot.  
- Logs er nemme at tilgå.  
- Ingen begrænsninger fra shared hosting.

---

Vil du have, at jeg også laver et lille **færdigt `deploy.sh` script**, så du kan sætte hele miljøet op på en frisk VPS med ét enkelt kommando‑sæt?


## 📜 `deploy.sh`

```bash
#!/bin/bash
# deploy.sh – Sæt TapoC100 motion capture op på en Ubuntu VPS

set -e

APP_NAME="motion-capture"
APP_DIR="/opt/$APP_NAME"

echo "🔄 Opdaterer system..."
sudo apt update && sudo apt upgrade -y

echo "📦 Installerer afhængigheder..."
sudo apt install -y git curl build-essential ffmpeg

echo "📦 Installerer Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

echo "⚙️ Installerer PM2 globalt..."
sudo npm install -g pm2

echo "📂 Opretter app-mappe..."
sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR

echo "⬇️ Henter projekt (tilpas evt. git-URL)..."
cd $APP_DIR
if [ ! -d ".git" ]; then
  git clone https://github.com/din-bruger/tapo-c100-rtsp.git .
else
  git pull
fi

echo "📦 Installerer npm-pakker..."
npm install
npm run build

echo "⚙️ Opretter .env (tilpas værdierne)..."
cat > .env <<EOF
CAMERA_IP=192.168.1.50
USRNAME=admin
PASSWORD=hemmeligt
CALM_PERIOD=10
PORT=10000
EOF

echo "🚀 Starter app med PM2..."
pm2 delete $APP_NAME || true
pm2 start dist/motion-capture.js --name $APP_NAME \
  --log-date-format="YYYY-MM-DD HH:mm:ss" \
  --max-memory-restart 512M

echo "💾 Gemmer PM2 konfiguration..."
pm2 save

echo "🔁 Aktiverer PM2 ved reboot..."
pm2 startup systemd -u $USER --hp $HOME | tail -n 1 | bash

echo "✅ Deploy færdig!"
pm2 status
```

---

## 🔧 Brug
1. Upload `deploy.sh` til din VPS (fx via `scp`).  
2. Gør den eksekverbar:
   ```bash
   chmod +x deploy.sh
   ```
3. Kør den:
   ```bash
   ./deploy.sh
   ```

---

## 🌐 Resultat
- Node.js 20, ffmpeg og PM2 er installeret.  
- Dit projekt ligger i `/opt/motion-capture`.  
- `.env` er oprettet (tilpas IP, brugernavn og password).  
- PM2 kører appen og starter den automatisk efter reboot.  
- Du kan se status og logs med:
  ```bash
  pm2 status
  pm2 logs motion-capture
  ```

---

👉 Vil du have, at jeg også laver en **`update.sh`** (til senere brug), så du med ét klik kan hente ny kode fra GitHub, bygge og genstarte appen?

Perfekt 🙌 – her får du et lille **`update.sh`** script, som du kan lægge i din projektmappe på VPS’en. Det gør det nemt at hente ny kode, bygge og genstarte din app med ét enkelt kald.

---

## 📜 `update.sh`

```bash
#!/bin/bash
# update.sh – Opdaterer motion-capture projektet på VPS

set -e

APP_NAME="motion-capture"
APP_DIR="/opt/$APP_NAME"

echo "⬇️ Henter seneste kode..."
cd $APP_DIR
git pull

echo "📦 Installerer evt. nye npm-pakker..."
npm install

echo "🔨 Bygger projektet..."
npm run build

echo "🚀 Genstarter app med PM2..."
pm2 restart $APP_NAME

echo "📋 Status:"
pm2 status $APP_NAME
```

---

## 🔧 Brug
1. Gem scriptet i din projektmappe (fx `/opt/motion-capture/update.sh`).  
2. Gør det eksekverbart:
   ```bash
   chmod +x update.sh
   ```
3. Kør det når du vil opdatere:
   ```bash
   ./update.sh
   ```

---

## 🌟 Fordele
- Du slipper for at huske alle kommandoerne.  
- Henter nyeste kode fra GitHub.  
- Installerer automatisk nye afhængigheder.  
- Bygger TypeScript‑koden.  
- Genstarter appen i PM2 uden nedetid.  

---

👉 På den måde har du nu både et **deploy‑script** til første opsætning og et **update‑script** til løbende drift.  


---

Min hostede løsning har vigtige mangler, som jeg har løst lokalt, men som pga netværksbegrænsninger ikke kører hosted:
---
- modtagelse af motion events, som en væsentlig forbedring af hasMotion funktionen
- ONVIF forespørgsler: 1) KameraId inkl navn, model, ip-adresse og mac-adresse. 2) bestilling af snapshot
Men måske er det endnu bedre at bruge et konfigurerbart vildt kamera med sim kort og public adgang fra mit program fra en server.

---  
Det er en rigtig skarp observation – du har allerede set, at din kode fungerer lokalt, men at Simplys hostingmiljø sætter hårde grænser for RTSP, ONVIF og netværksadgang. Lad os bryde det ned:

---

## 🔎 Hvorfor din hostede løsning halter
- **RTSP/ONVIF blokeret**: Shared hosting tillader sjældent direkte netværksforbindelser til kameraer. ONVIF (SOAP over HTTP/UDP) og RTSP kræver åbne porte, som typisk er lukket.
- **Motion events**: Mange kameraer kan sende “push events” (via ONVIF eller HTTP callbacks). Det er langt mere effektivt end at sammenligne frames, men kræver at serveren kan modtage forbindelser fra kameraet – og det kan Simply ikke levere.
- **Snapshots via ONVIF**: Samme problem – uden fri netværksadgang kan du ikke lave forespørgsler til kameraets ONVIF‑endpoint.

---

## 🦌 Alternativ: “vildtkamera” med SIM‑kort
Det du foreslår – et kamera med eget SIM‑kort og public endpoint – er faktisk en elegant vej uden om hosting‑begrænsningerne:

- **Fordele**
  - Kameraet uploader selv til skyen eller eksponerer en offentlig URL, som din server kan hente fra (HTTP/HTTPS i stedet for RTSP).
  - Du slipper for at åbne porte i dit eget netværk.
  - SIM‑kort giver uafhængighed af dit lokale internet.
  - Mange nyere “wildlife” eller “LTE surveillance” kameraer har API’er eller kan sende billeder via e‑mail/FTP/HTTP.

- **Ulemper**
  - Løbende udgift til SIM‑kort/data.
  - Mindre fleksibilitet end et fuldt ONVIF‑kompatibelt IP‑kamera.
  - Ofte lavere billedkvalitet eller færre konfigurationsmuligheder.

---

## 🔧 Mulige arkitekturer
1. **VPS + dit nuværende kamera**
   - Flyt dit program til en VPS (fx Hetzner, DigitalOcean, Azure).
   - Åbn firewall så VPS’en kan nå dit kamera via RTSP/ONVIF.
   - Kræver at dit kamera er tilgængeligt udefra (port forwarding eller VPN).

2. **SIM‑kamera med public endpoint**
   - Kameraet uploader selv billeder/video til en cloud eller eksponerer en URL.
   - Din VPS henter billederne via HTTPS (ingen RTSP/ONVIF).
   - Meget robust, men afhængig af kameraets funktioner.

3. **Hybrid**
   - Brug dit nuværende kamera lokalt (fx på en Raspberry Pi), som så uploader snapshots/events til din VPS.
   - VPS’en står for webserver/galleri, men selve motion detection og ONVIF‑håndtering sker tæt på kameraet.

---



## ✅ Anbefaling
Hvis du vil have **fuld kontrol og ONVIF‑funktioner** (motion events, kamera‑metadata, snapshots on demand), så er en **VPS + ONVIF‑kompatibelt kamera** den bedste løsning.  
Hvis du vil have **simpel drift uden netværkskonfiguration**, så er et **LTE/SIM‑kamera** med public adgang en nemmere vej.

---

Planen er at opsætte mange kameraer både ude og inde. Hvilke krav kan jeg sætte til høj billedekvalitets ip kameraer, som mit serverprogram kan kommunikere med og vil du give nogle eksempler?
---

Det er en rigtig god idé at definere nogle klare **kravspecifikationer** til dine IP‑kameraer, når du planlægger en større installation. Så sikrer du både høj billedkvalitet og nem integration med dit serverprogram.  

---

## 🔑 Krav du kan stille til kameraerne

### 1. **Standarder og protokoller**
- **ONVIF support (Profile S/T/G/M)** → sikrer at du kan hente metadata, motion events, snapshots og styre kameraet via standardiserede API’er.  
- **RTSP‑stream** → giver dig direkte adgang til videostrømmen, som dit program allerede bruger.  
- **HTTP/HTTPS snapshot endpoint** → gør det nemt at hente enkeltbilleder uden at starte en RTSP‑session.  

### 2. **Billedkvalitet**
- **Opløsning**: Minimum 4 MP (2560×1440), gerne 8 MP (4K) til udendørs overvågning.  
- **Sensorstørrelse**: 1/2.8” eller større CMOS‑sensor for bedre lysfølsomhed.  
- **WDR (Wide Dynamic Range)**: vigtigt i områder med både skygge og sollys.  
- **IR‑lys / natvision**: mindst 30 m rækkevidde, helst med “Smart IR” for at undgå overeksponering tæt på.  

### 3. **Netværk og drift**
- **PoE (Power over Ethernet)** → ét kabel til både strøm og data, meget nemmere i større installationer.  
- **Gigabit‑netværk** hvis du vil have mange 4K‑streams samtidigt.  
- **Edge‑storage** (microSD‑kort) som backup, hvis netværket går ned.  

### 4. **Robusthed**
- **IP66/IP67** til udendørs (støv- og vandtæt).  
- **IK10** hvis de skal være hærværkssikre.  
- **Temperaturspænd**: fx −30 °C til +60 °C for udendørs kameraer i Norden.  

### 5. **Intelligente funktioner (valgfrit)**
- Motion detection via ONVIF events (så du slipper for at lave frame‑differencing selv).  
- Person-/køretøjsgenkendelse (AI‑baseret).  
- Mulighed for at konfigurere flere streams (lav opløsning til analyse, høj opløsning til snapshots).  

---

## 📸 Eksempler på kameraer i høj kvalitet

- **Axis Communications (svensk producent, meget udbredt i enterprise)**  
  - Axis P32‑serie (indendørs/udendørs, 1080p–4K, ONVIF, PoE).  
  - Axis Q35‑serie (høj lysfølsomhed, WDR, robust).  

- **Hikvision (pris/ydelse, bredt udvalg)**  
  - Hikvision DS‑2CD2087G2‑LU (8 MP, ColorVu, ONVIF, PoE).  
  - Hikvision DS‑2CD2146G2‑ISU (4 MP dome, WDR, indbygget mikrofon).  

- **Dahua (stort udvalg, ONVIF‑kompatible)**  
  - Dahua IPC‑HFW5849T1‑ASE (8 MP, fuld farve natvision, PoE).  
  - Dahua IPC‑HDBW5442R‑ZE (4 MP, motoriseret zoom, WDR).  

- **Reolink (budgetvenlig, men stadig ONVIF/RTSP)**  
  - Reolink RLC‑811A (8 MP, 5× optisk zoom, PoE, ONVIF).  
  - Reolink RLC‑822A (8 MP, fast linse, PoE).  

---

## 🧭 Opsummering
Når du vælger kameraer til dit system, bør du kræve:
- **ONVIF + RTSP** (for integration).  
- **4–8 MP opløsning** med god sensor og WDR.  
- **PoE** for enkel installation.  
- **IP66/IP67** til udendørs.  
- **Edge‑storage** som backup.  

Så kan dit serverprogram kommunikere direkte med kameraerne, hente motion events, snapshots og streams – uden at du skal lave workarounds.

---

Tak. Kan du nævne kameraer som også understøtter SIM kort og HTTPS
---

Selvfølgelig – der findes en række moderne overvågningskameraer, som har indbygget **SIM‑kort (3G/4G/5G)** og samtidig tilbyder **HTTPS‑adgang** til snapshots eller live‑stream. De er oplagte, hvis du vil placere kameraer steder uden fast net eller Wi‑Fi, men stadig have sikker fjernadgang.

---

## 🔑 Typiske krav du kan stille
- **SIM‑kort slot (LTE/4G/5G)** → kameraet kan selv gå på mobilnettet.  
- **HTTPS support** → krypteret adgang til snapshots og live‑stream.  
- **ONVIF/RTSP** (hvis du vil integrere med dit eget serverprogram).  
- **Cloud eller direkte URL** → så du kan hente billeder/video via dit program.  
- **PoE eller solcelle/batteri** → afhængigt af om kameraet skal være mobilt eller fastmonteret.  

---

## 📸 Eksempler på kameraer med SIM + HTTPS

| Kamera | Funktioner | Noter |
|--------|------------|-------|
| **Reolink Go Plus / Go PT Plus / Duo 2 LTE** | 4G LTE via SIM, 2K–4K opløsning, natvision, app + HTTPS adgang, ONVIF/RTSP understøttelse | Meget populære til sommerhuse, byggepladser og landbrug. |
| **Reolink TrackMix LTE** | 4G LTE, dual‑linse (vidvinkel + tele), PTZ, HTTPS, notifikationer via app/mail | God til områder hvor du vil zoome ind på detaljer. |
| **KEEN Ranger PT (fra Reolink)** | 4G LTE, batteri + solcelle, PTZ, HTTPS, designet som vildtkamera | Perfekt til natur/landbrug uden strøm. |
| **Arenti GO3G 4G** | 4G LTE, batteri + solcelle, HTTPS adgang via app/web | Budgetvenlig løsning til mobile opsætninger. |
| **Hikvision 4G/LTE modeller (f.eks. DS‑2XS6A25G0‑I/CH20S40)** | Professionelle 4G‑kameraer, ONVIF, HTTPS, PoE/solcellemulighed | Enterprise‑niveau, robust til industri og kritisk overvågning. |

---

## 🌟 Hvad du får ud af SIM + HTTPS
- **Ingen afhængighed af lokal router** → kameraet kan stå hvor som helst med mobildækning.  
- **Sikker adgang** → HTTPS betyder, at du kan hente snapshots direkte i dit program uden at sende ukrypterede forespørgsler.  
- **Skalerbarhed** → du kan sætte mange kameraer op, både inde og ude, uden at bekymre dig om netværkskabler.  

---

Hvilke profiler hvis jeg skal kunne: hente metadata, motion events og hente snapshots fra kameraet via standardiserede API’er.
---

Godt spørgsmål – ONVIF har netop defineret forskellige **profiler**, som sikrer at kameraer og klienter kan tale sammen på en standardiseret måde. Hvis du vil kunne hente **metadata, motion events og snapshots** via API’er, er det især disse profiler, du skal kigge efter:

---

## 🔑 Relevante ONVIF‑profiler

| Profil | Hvad den dækker | Relevans for dig |
|--------|-----------------|------------------|
| **Profile S** | Standardiseret **videostreaming** (RTSP/H.264/H.265), snapshots via HTTP, PTZ‑kontrol. | Giver dig adgang til snapshots og live‑video. |
| **Profile T** | Moderne streaming (H.265, avanceret metadata, events, analytics). | Mere fremtidssikret end S, og inkluderer metadata i streamen. |
| **Profile G** | **Recording og playback** af video og metadata (NVR‑integration). | Relevant hvis du vil gemme og hente optagelser + metadata. |
| **Profile M** | **Metadata og events** fra kameraets analytics (motion detection, objekter, ansigter, nummerplader osv.). | Det vigtigste for at få motion events og struktureret metadata via standardiseret API. |

---

## 🧭 Hvad du bør kræve
- **Profile S eller T** → for snapshots og videostream.  
- **Profile M** → for motion events og metadata (fx “der er bevægelse”, “der er en person i billedet”).  
- **Evt. Profile G** → hvis du også vil kunne hente optagelser og metadata fra kameraets interne lagring.  

---

## ✅ Konklusion
Hvis du vil være sikker på at kunne:
- **Hente snapshots** → kræv **Profile S eller T**.  
- **Modtage motion events** → kræv **Profile M**.  
- **Hente metadata (objekter, klassifikationer, analytics)** → kræv **Profile M**.  

---

👉 Mit råd: Når du vælger kameraer, så kig efter **ONVIF Profile S + M (og gerne T)** i specifikationerne. Så er du dækket ind til både snapshots, motion events og metadata via standardiserede API’er.  

---

Hvilken profil understøtter kamara id?
---
Godt spørgsmål – her er det vigtigt at skelne mellem **kameraets identitet** (navn, model, serienummer, IP, MAC osv.) og de forskellige ONVIF‑profiler:

---

## 🎯 Kamera‑ID og ONVIF
- **Kameraets identitet** (manufacturer, model, firmware, serienummer, hardware‑ID, MAC, IP osv.) hentes via ONVIF’s **Device Management Service**.  
- Device Management er **grundlæggende ONVIF‑funktionalitet** og kræver **ikke en bestemt profil** som S, T, G eller M.  
- Alle ONVIF‑kompatible kameraer skal kunne svare på disse forespørgsler, ellers er de ikke fuldt ONVIF‑conforme.

---

## 🔑 Hvilke profiler er så relevante?
- **Profile S** → streaming + snapshots.  
- **Profile T** → moderne streaming + metadata.  
- **Profile M** → events og analytics (motion, objekter, metadata).  
- **Device Management (basis)** → giver dig kameraets ID‑information.  

Så:  
- **Kamera‑ID (navn, model, serienummer, IP, MAC)** → hentes via **Device Management**, ikke en specifik profil.  
- **Motion events og metadata** → kræver **Profile M**.  
- **Snapshots og streams** → kræver **Profile S eller T**.

---

## ✅ Konklusion
Hvis dit mål er at kunne hente **kameraets identitet**, skal du sikre dig at kameraet er **ONVIF‑conformant** (alle conformant enheder understøtter Device Management).  
Hvis du også vil have **motion events og metadata**, så kræv **Profile M**.  
Hvis du vil have **snapshots og streams**, så kræv **Profile S eller T**.

---


# Links
[ONVIF](https://www.onvif.org)  
[Conformant Products](https://www.onvif.org/conformant-products/)  
[Profile S For basic video streaming Video streaming and configuration](https://www.onvif.org/profiles/rofile-s/)  
[Profile M  Metadata and events for analytics applications](https://www.onvif.org/profiles/profile-m/)  
[ONVIF Client protocol Profile S (Live Streaming) and Profile G (Replay) Node.js implementation](https://www.npmjs.com/package/onvif)