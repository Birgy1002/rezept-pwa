// server.js
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

const app = express();
app.use(cors());

app.get("/proxy", async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) return res.status(400).json({ error: "Parameter ?url fehlt" });

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: `Upstream-Fehler ${response.status}` });
    }

    const html = await response.text();

    // Wenn HTML leer oder kein <html>, Dummy zurückgeben
    if (!html || !html.includes("<html")) {
      return res.json({
        recipe: {
          id: `recipe-${Date.now()}`,
          title: "Kein Rezept gefunden",
          description: `Fehler beim Laden von ${url}`,
          image_url: null,
          servings: null,
        },
        ingredients: [],
        steps: [],
      });
    }

    const $ = cheerio.load(html);

    // Titel
    const title =
      $("h1").first().text().trim() || $("title").first().text().trim();

    // Bild
    const image_url =
      $('meta[property="og:image"]').attr("content") ||
      $("article img").first().attr("src") ||
      $("img").first().attr("src") ||
      null;

    // Zutaten (fokussiert auf typische Rezept-Plugins)
    const ingredients = [];
    $(".wprm-recipe-ingredient").each((i, el) => {
      const text = $(el).text().trim();
      if (text) {
        ingredients.push({
          id: `ing-${i + 1}`,
          name: text,
          position: i + 1,
        });
      }
    });

    // Schritte (fokussiert auf typische Rezept-Plugins)
    const steps = [];
    $(".wprm-recipe-instruction").each((i, el) => {
      const text = $(el).text().trim();
      if (text) {
        steps.push({
          id: `step-${i + 1}`,
          description: text,
          position: i + 1,
        });
      }
    });

    // JSON-Antwort
    res.json({
      recipe: {
        id: `recipe-${Date.now()}`,
        title: title || "Unbekanntes Rezept",
        description: `Importiert von ${url}`,
        image_url,
        servings: null,
      },
      ingredients,
      steps,
    });
  } catch (e) {
    console.error("Proxy-Fehler:", e);
    res.status(500).json({
      error: "Fehler beim Abrufen/Parsen",
      details: e.message,
    });
  }
});

// Port automatisch finden (falls 3001 belegt ist)
function startServer(port) {
  const server = app
    .listen(port, () => {
      console.log(
        `✅ Proxy läuft auf http://localhost:${port}/proxy?url=...`
      );
    })
    .on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.warn(`⚠️ Port ${port} belegt, versuche ${port + 1}...`);
        startServer(port + 1);
      } else {
        console.error("Server-Fehler:", err);
      }
    });
}

startServer(3001);
