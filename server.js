// server.js
import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());

// Aus Sicherheitsgründen: nur erlaubte Domains (Whitelist)
const ALLOWED_HOSTS = new Set([
  "thehiddenveggies.com",
]);

app.get("/proxy", async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) return res.status(400).json({ error: "Parameter ?url fehlt" });

    const u = new URL(url);
    if (!ALLOWED_HOSTS.has(u.hostname)) {
      return res.status(403).json({ error: "Domain nicht erlaubt" });
    }

    const response = await fetch(url, {
      // viele Seiten blocken Requests ohne realistischen UA
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept":
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: `Upstream-Fehler ${response.status}` });
    }

    const html = await response.text();
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (e) {
    console.error("Proxy-Fehler:", e);
    res.status(500).json({ error: "Fehler beim Abrufen der Seite" });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Proxy-Server läuft: http://localhost:${PORT}/proxy?url=<ENCODED_URL>`);
});
