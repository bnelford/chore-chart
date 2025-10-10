import express from "express";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;
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

app.use(express.json({ limit: "1mb" }));

const ensureConfigDir = async () => {
  const configDir = path.dirname(CONFIG_PATH);
  await fs.mkdir(configDir, { recursive: true });
};

const readConfig = async () => {
  try {
    const raw = await fs.readFile(CONFIG_PATH, "utf8");
    const parsed = JSON.parse(raw);
    const merged = { ...DEFAULT_CONFIG, ...parsed };

    if (!merged.weekdayChoresText && parsed.choresText) {
      merged.weekdayChoresText = parsed.choresText;
    }
    if (!merged.weekendAlternatesText && parsed.saturdayChoresText) {
      merged.weekendAlternatesText = parsed.saturdayChoresText;
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
  await ensureConfigDir();
  const safeConfig = { ...DEFAULT_CONFIG, ...config };
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
  const config = req.body;
  if (!config || typeof config !== "object") {
    return res.status(400).json({ error: "Invalid configuration payload." });
  }

  try {
    await writeConfig(config);
    res.status(204).end();
  } catch (error) {
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
