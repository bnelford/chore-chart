import express from "express";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 53123;
const CONFIG_PATH = path.resolve(__dirname, "../config/chore-config.json");
const PUBLIC_PATH = path.resolve(__dirname, "../public");

const DEFAULT_CONFIG = {
  month: null,
  peopleText: "",
  weekdayChoresText: "",
  weekendAlternatesText: "",
  rotationStartDate: null,
  rotationDirection: "forward",
  startingPerson: "",
  viewMode: "calendar"
};

const TEXT_FIELDS = [
  "peopleText",
  "weekdayChoresText",
  "weekendAlternatesText",
  "startingPerson",
];
const NULLABLE_TEXT_FIELDS = ["month", "rotationStartDate"];
const STRING_FIELDS = ["rotationDirection", "viewMode"];

const isPlainObject = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const sanitizeConfig = (input) => {
  if (!isPlainObject(input)) {
    return null;
  }

  const safe = { ...DEFAULT_CONFIG };
  for (const key of TEXT_FIELDS) {
    if (typeof input[key] === "string") {
      safe[key] = input[key];
    }
  }
  for (const key of NULLABLE_TEXT_FIELDS) {
    if (input[key] === null || typeof input[key] === "string") {
      safe[key] = input[key];
    }
  }
  for (const key of STRING_FIELDS) {
    if (typeof input[key] === "string") {
      safe[key] = input[key];
    }
  }
  return safe;
};

app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdnjs.cloudflare.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob:",
      "connect-src 'self'",
      "worker-src 'self' blob:",
      "frame-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'self'",
      "form-action 'self'",
    ].join("; ")
  );
  next();
});
app.use(express.json({ limit: "1mb" }));

const ensureConfigDir = async () => {
  const configDir = path.dirname(CONFIG_PATH);
  await fs.mkdir(configDir, { recursive: true });
};

const readConfig = async () => {
  try {
    const raw = await fs.readFile(CONFIG_PATH, "utf8");
    const parsed = JSON.parse(raw);
    const merged = sanitizeConfig(parsed) ?? { ...DEFAULT_CONFIG };
    const legacy = parsed && typeof parsed === "object" ? parsed : {};

    if (!merged.weekdayChoresText && typeof legacy.choresText === "string") {
      merged.weekdayChoresText = legacy.choresText;
    }
    if (!merged.weekendAlternatesText && typeof legacy.saturdayChoresText === "string") {
      merged.weekendAlternatesText = legacy.saturdayChoresText;
    }
    return merged;
  } catch (error) {
    if (error.code === "ENOENT") {
      return { ...DEFAULT_CONFIG };
    }
    console.error("Failed to read config:", error);
    throw error;
  }
};

const writeConfig = async (config) => {
  const safeConfig = sanitizeConfig(config);
  if (!safeConfig) {
    const error = new Error("Invalid configuration payload.");
    error.statusCode = 400;
    throw error;
  }
  await ensureConfigDir();
  await fs.writeFile(CONFIG_PATH, JSON.stringify(safeConfig, null, 2), "utf8");
};

app.get("/api/config", async (req, res) => {
  try {
    const config = await readConfig();
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: "Failed to read configuration." });
  }
});

app.post("/api/config", async (req, res) => {
  try {
    await writeConfig(req.body);
    res.status(204).end();
  } catch (error) {
    if (error.statusCode === 400) {
      return res.status(400).json({ error: "Invalid configuration payload." });
    }
    console.error("Failed to write config:", error);
    res.status(500).json({ error: "Failed to save configuration." });
  }
});

app.use(express.static(PUBLIC_PATH, { extensions: ["html"] }));

app.get("*", (req, res) => {
  res.sendFile(path.join(PUBLIC_PATH, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Chore chart server listening on http://localhost:${PORT}`);
});
