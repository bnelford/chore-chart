import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const configPath = path.join(root, "config", "chore-config.json");

const reservePort = () =>
  new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address();
      probe.close((error) => (error ? reject(error) : resolve(port)));
    });
  });

const startServer = async (port) => {
  const child = spawn(process.execPath, ["server/index.js"], {
    cwd: root,
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let logs = "";
  child.stdout.on("data", (chunk) => {
    logs += chunk;
  });
  child.stderr.on("data", (chunk) => {
    logs += chunk;
  });

  const ready = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`server did not start\n${logs}`));
    }, 5000);
    const check = () => {
      if (logs.includes("listening")) {
        clearTimeout(timer);
        resolve();
      }
    };
    child.stdout.on("data", check);
    child.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`server exited ${code}\n${logs}`));
    });
  });

  await ready;
  return {
    child,
    stop: async () => {
      if (child.exitCode !== null) return;
      child.kill("SIGTERM");
      await once(child, "exit");
    },
  };
};

test("pinned browser libraries and patched Node image", async () => {
  const html = await fs.readFile(path.join(root, "public", "index.html"), "utf8");
  const dockerfile = await fs.readFile(path.join(root, "Dockerfile"), "utf8");

  assert.match(
    html,
    /react@18\.3\.1\/umd\/react\.production\.min\.js" integrity="sha384-DGyLxAyjq0f9SPpVevD6IgztCFlnMF6oW\/XQGmfe\+IsZ8TqEiDrcHkMLKI6fiB\/Z"/
  );
  assert.match(
    html,
    /react-dom@18\.3\.1\/umd\/react-dom\.production\.min\.js" integrity="sha384-gTGxhz21lVGYNMcdJOyq01Edg0jhn\/c22nsx0kyqP0TxaV5WVdsSH1fSDUf5YJj1"/
  );
  assert.match(
    html,
    /@babel\/standalone@8\.1\.2\/babel\.min\.js" integrity="sha384-UAlciMo5b2RD3a217OI\/cCTcJmMLNExS2TKgjGbkN2s81rj5PMd2J2kKlsD3PS8x"/
  );
  assert.match(
    html,
    /html2canvas\/1\.4\.1\/html2canvas\.min\.js" integrity="sha384-ZZ1pncU3bQe8y31yfZdMFdSpttDoPmOZg2wguVK9almUodir1PghgT0eY7Mrty8H"/
  );
  assert.match(
    html,
    /jspdf\/2\.5\.1\/jspdf\.umd\.min\.js" integrity="sha384-JcnsjUPPylna1s1fvi1u12X5qjY5OL56iySh75FdtrwhO\/SWXgMjoVqcKyIIWOLk"/
  );
  assert.doesNotMatch(html, /react\.development\.js/);
  assert.match(dockerfile, /node:22\.23\.5-alpine@sha256:f4081a5ddded4f76ddd2ae8cc37b3d817926871c64b11b8f684be2a588a7792d/);
  assert.match(dockerfile, /npm ci --omit=dev --ignore-scripts/);
});

test("configuration writes keep chore text and reject unsafe payloads", async (t) => {
  const backup = await fs.readFile(configPath, "utf8").catch((error) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  await fs.rm(configPath, { force: true });

  const port = await reservePort();
  const server = await startServer(port);
  const base = `http://127.0.0.1:${port}`;

  t.after(async () => {
    await server.stop();
    if (backup === null) {
      await fs.rm(configPath, { force: true });
    } else {
      await fs.writeFile(configPath, backup);
    }
  });

  const defaults = await fetch(`${base}/api/config`).then((response) => response.json());
  assert.deepEqual(defaults, {
    month: null,
    peopleText: "",
    weekdayChoresText: "",
    weekendAlternatesText: "",
    rotationStartDate: null,
    rotationDirection: "forward",
    startingPerson: "",
    viewMode: "calendar",
  });

  const payload = {
    month: "2026-11",
    peopleText: "Alex\nJordan",
    weekdayChoresText: "Dishes\n\nTrash & Recycling\r\n<script>alert(1)</script>",
    weekendAlternatesText: "Deep Clean Kitchen\n",
    rotationStartDate: "2026-11-02",
    rotationDirection: "reverse",
    startingPerson: "Jordan",
    viewMode: "table",
  };
  const saved = await fetch(`${base}/api/config`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  assert.equal(saved.status, 204);
  const roundTrip = await fetch(`${base}/api/config`).then((response) => response.json());
  assert.deepEqual(roundTrip, payload);

  await fs.writeFile(
    configPath,
    JSON.stringify({
      choresText: "Legacy Dishes\nLegacy Laundry",
      saturdayChoresText: "Legacy Kitchen",
    })
  );
  const migrated = await fetch(`${base}/api/config`).then((response) => response.json());
  assert.equal(migrated.weekdayChoresText, "Legacy Dishes\nLegacy Laundry");
  assert.equal(migrated.weekendAlternatesText, "Legacy Kitchen");
  assert.equal(migrated.rotationDirection, "forward");

  const poisoned = await fetch(`${base}/api/config`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      peopleText: { drop: "table" },
      weekdayChoresText: "Dishes\nLaundry",
      weekendAlternatesText: "Meal Prep",
      month: "2026-11",
      rotationStartDate: "2026-11-03",
      startingPerson: "Alex",
      rotationDirection: "forward",
      viewMode: "calendar",
      extra: "<script>alert(1)</script>",
    }).replace(
      '"extra"',
      '"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}},"extra"'
    ),
  });
  assert.equal(poisoned.status, 204);
  const healed = await fetch(`${base}/api/config`).then((response) => response.json());
  assert.equal(healed.peopleText, "");
  assert.equal(healed.weekdayChoresText, "Dishes\nLaundry");
  assert.equal(healed.weekendAlternatesText, "Meal Prep");
  assert.equal(Object.hasOwn(healed, "extra"), false);
  assert.equal(healed.polluted, undefined);

  const beforeReject = await fs.readFile(configPath, "utf8");
  const rejected = await fetch(`${base}/api/config`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "[]",
  });
  assert.equal(rejected.status, 400);
  assert.equal(await fs.readFile(configPath, "utf8"), beforeReject);

  const page = await fetch(`${base}/`);
  assert.equal(page.status, 200);
  assert.equal(page.headers.get("x-content-type-options"), "nosniff");
  assert.equal(page.headers.get("x-frame-options"), "SAMEORIGIN");
  assert.equal(page.headers.get("referrer-policy"), "no-referrer");
  assert.equal(page.headers.get("x-powered-by"), null);
  const csp = page.headers.get("content-security-policy");
  assert.ok(csp);
  assert.match(csp, /default-src 'self'/);
  assert.match(csp, /script-src[^;]*https:\/\/unpkg\.com/);
  assert.match(csp, /script-src[^;]*https:\/\/cdnjs\.cloudflare\.com/);
});
