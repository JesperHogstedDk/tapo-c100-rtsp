// src/motion-capture.ts

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import express from "express";
import dotenv from "dotenv";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";

dotenv.config();
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Miljøvariable
const CAMERA_IP = process.env.CAMERA_IP;
const USRNAME = process.env.USRNAME;
const PASSWORD = process.env.PASSWORD;
const CALM_PERIOD = Number(process.env.CALM_PERIOD) || 10; // sekunder

if (!CAMERA_IP || !USRNAME || !PASSWORD || !CALM_PERIOD) {
  logError("❌ Mangler miljøvariable: CAMERA_IP / USRNAME / PASSWORD / CALM_PERIOD");
  process.exit(1);
}

const SNAPSHOT_DIR = path.join(__dirname, "snapshots");
if (!fs.existsSync(SNAPSHOT_DIR)) fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });

const RTSP_LOW = `rtsp://${USRNAME}:${PASSWORD}@${CAMERA_IP}:554/stream2`;
const RTSP_HIGH = `rtsp://${USRNAME}:${PASSWORD}@${CAMERA_IP}:554/stream1`;

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

function timestamp(): string {
  return new Date().toISOString().replace("T", " ").split(".")[0];
}

function log(msg: string) {
  console.log(`${timestamp()} ${msg}`);
}

function logError(msg: string, err?: any) {
  console.error(`${timestamp()} ❌ ${msg}`, err || "");
}

// Hent ét frame fra en RTSP-stream som buffer
function grabFrame(rtspUrl: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    const command = ffmpeg(rtspUrl)
      .inputOptions(["-rtsp_transport", "tcp", "-stimeout", "5000000"])
      .frames(1)
      .outputOptions("-q:v 2")
      .format("image2pipe")
      .on("start", (cmdLine) => {
        // log(`▶️ ffmpeg start: ${cmdLine}`);   // <-- tilføjet logging
      })
      .on("error", (err) => {
        logError("Fejl i ffmpeg-proces", err);
        reject(err);
      })
      .on("end", () => {
        resolve(Buffer.concat(chunks));
      });

    const stream = command.pipe();
    stream.on("data", (chunk) => chunks.push(chunk));
  });
}

// Robust variant med retry
async function grabFrameSafe(rtspUrl: string, retries = 3): Promise<Buffer> {
  for (let i = 1; i <= retries; i++) {
    try {
      const buffer = await grabFrame(rtspUrl);
      return buffer;
    } catch (err: any) {
      logError(`grabFrame fejl (forsøg ${i}/${retries})`, err.message);
      if (i < retries) {
        log("⏳ Venter 30 sekunder før nyt forsøg...");
        await delay(30000);   // <-- ændret fra setTimeout(monitor,…)
      }
    }
  }
  throw new Error("grabFrame fejlede efter flere forsøg");
}


// Enkel motion detection: sammenlign buffer-størrelse
async function hasMotion(prev: Buffer, curr: Buffer, thresholdBytes = 5000): Promise<boolean> {
  return Math.abs(prev.length - curr.length) > thresholdBytes;
}

// Gem snapshot i høj opløsning
async function takeHighSnapshot() {
  const now = new Date();
  const folder = path.join(SNAPSHOT_DIR, now.toISOString().split("T")[0]);
  if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
  const filename = path.join(folder, `${now.toTimeString().split(" ")[0].replace(/:/g, "-")}.jpg`);

  try {
    const buf = await grabFrameSafe(RTSP_HIGH);
    fs.writeFileSync(filename, buf);
    log(`📸 Højopløsnings-snapshot gemt: ${filename}`);
  } catch (err) {
    logError("Kunne ikke hente high snapsh1ot:", err);
  }
}

// Find nyeste snapshot
function getLatestSnapshot(): string | null {
  let latestFile: string | null = null;
  let latestMtime = 0;

  fs.readdirSync(SNAPSHOT_DIR, { withFileTypes: true }).forEach((entry) => {
    if (entry.isDirectory()) {
      const folder = path.join(SNAPSHOT_DIR, entry.name);
      fs.readdirSync(folder).forEach((f) => {
        if (f.endsWith(".jpg")) {
          const fp = path.join(folder, f);
          const mtime = fs.statSync(fp).mtimeMs;
          if (mtime > latestMtime) {
            latestMtime = mtime;
            latestFile = fp;
          }
        }
      });
    }
  });
  return latestFile;
}

// Overvåg bevægelse og tag high-res når roen har varet CALM_PERIOD sekunder
async function monitor() {
  log("Starter motion detection...");
  try {
    let prev = await grabFrameSafe(RTSP_LOW);
    let motionDetected = false;
    let lastMotionTime = Date.now();

    while (true) {
      try {
        const curr = await grabFrameSafe(RTSP_LOW);
        if (await hasMotion(prev, curr)) {
          motionDetected = true;
          lastMotionTime = Date.now();
          log("🔎 Bevægelse registreret...");
        }
        prev = curr;

        // Hvis der har været ro i CALM_PERIOD sekunder
        if (motionDetected && Date.now() - lastMotionTime > CALM_PERIOD * 1000) {
          log("✅ Ro registreret – tager high snapshot");
          await takeHighSnapshot();
          motionDetected = false;
        }
      } catch (err) {
        logError("Fejl i monitor-loop:", err);
        await delay(2000);
      }
      await delay(1000);
    }
  } catch (err) {
    logError("Monitor crashede:", err);
    setTimeout(monitor, 5000); // genstart hele monitor efter 5 sek
  }
}

// Webserver
const app = express();
const PORT = Number(process.env.PORT) || 10000;

app.set("etag", false);
app.use("/snapshots", express.static(SNAPSHOT_DIR, {
  etag: false,
  cacheControl: false,
  maxAge: 0,
}));

app.get("/", (_req, res) => {
  res.send("📸 Motion detection kører – se /latest og /photos");
});

// /latest finder nyeste snapshot
app.get("/latest", (_req, res) => {
  const latest = getLatestSnapshot();
  if (!latest) return res.status(404).send("Ingen snapshots endnu");
  const buf = fs.readFileSync(latest);
  res.setHeader("Content-Type", "image/jpeg");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Last-Modified", new Date().toUTCString());
  res.end(buf);
});

// /photos viser galleri med latest øverst
app.get("/photos", (_req, res) => {
  const files: { path: string; mtime: number }[] = [];
  fs.readdirSync(SNAPSHOT_DIR, { withFileTypes: true }).forEach((entry) => {
    if (entry.isDirectory()) {
      const folder = path.join(SNAPSHOT_DIR, entry.name);
      fs.readdirSync(folder).forEach((f) => {
        if (f.endsWith(".jpg")) {
          const fp = path.join(folder, f);
          files.push({ path: `/snapshots/${entry.name}/${f}`, mtime: fs.statSync(fp).mtimeMs });
        }
      });
    }
  });
  files.sort((a, b) => b.mtime - a.mtime);

  res.send(`
    <html>
      <head><title>📸 Galleri</title></head>
      <body>
        <h1>📸 Galleri</h1>
        <h2>Seneste snapshot</h2>
        <div>
          <img src="/latest?t=${Date.now()}" style="max-width:600px;border:2px solid #333;">
        </div>
        <h2>Alle billeder</h2>
        <div style="display:flex;flex-wrap:wrap;gap:10px;">
          ${files.map(f => `<a href="${f.path}?t=${f.mtime}" target="_blank">
            <img src="${f.path}?t=${f.mtime}" style="max-width:200px;border:1px solid #ccc;">
          </a>`).join("")}
        </div>
      </body>
    </html>
  `);
});

app.listen(PORT, "0.0.0.0", () => log(`🌐 Webserver kører på port ${PORT}`));

// Start overvågning
function startMonitor() {
  monitor().catch(err => {
    logError("Monitor crashede:", err);
    setTimeout(startMonitor, 5000);
  });
}
startMonitor();