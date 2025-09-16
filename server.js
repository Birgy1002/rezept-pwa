// server.js
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import * as cheerio from "cheerio"; // Parser für HTML
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json()); // damit wir JSON empfangen können

// Supabase verbinden
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Proxy + Parser-Route
app.get("/proxy", async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) return res.status(400).json({ error: "Parameter ?url fehlt" });

    // HTML laden
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept":
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: `Upstream-Fehler ${response.status}` });
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Titel
    const title =
      $("meta[property='og:title']").attr("content") ||
      $("title").text() ||
      "Unbekanntes Rezept";

    // Bild
    const image_url =
      $("meta[property='og:image']").attr("content") ||
      $("img").first().attr("src") ||
      null;

    // Zutaten (versuchen mehrere Varianten)
    let ingredients = [];
    $("li").each((_, el) => {
      const text = $(el).text().trim();
      if (
        text &&
        (text.match(/\d/) || text.match(/cup|g|ml|TL|EL|Teelöffel|Esslöffel/i))
      ) {
        ingredients.push(text);
      }
    });

    // Schritte (oft in <ol><li> oder div.instructions)
    let steps = [];
    $("ol li, .instructions li, .method li").each((_, el) => {
      const text = $(el).text().trim();
      if (text) steps.push(text);
    });

    // Falls leer, Dummy-Werte
    if (ingredients.length === 0) ingredients = ["(keine Zutaten erkannt)"];
    if (steps.length === 0) steps = ["(keine Schritte erkannt)"];

    // === In Supabase speichern ===
    const { data: recipe, error: recipeError } = await supabase
      .from("recipes")
      .insert([
        {
          title: title.trim(),
          description: `Importiert von ${url}`,
          image_url,
          servings: null,
        },
      ])
      .select()
      .single();

    if (recipeError) {
      console.error("Fehler beim Speichern in recipes:", recipeError);
      return res.status(500).json({ error: "Fehler beim Speichern in recipes" });
    }

    // Zutaten speichern
    const ingredientRows = ingredients.map((text, idx) => ({
      recipe_id: recipe.id,
      name: text,
      position: idx + 1,
    }));

    const { error: ingError } = await supabase
      .from("ingredients")
      .insert(ingredientRows);

    if (ingError) {
      console.error("Fehler beim Speichern in ingredients:", ingError);
    }

    // Schritte speichern
    const stepRows = steps.map((text, idx) => ({
      recipe_id: recipe.id,
      description: text,
      position: idx + 1,
    }));

    const { error: stepError } = await supabase.from("steps").insert(stepRows);

    if (stepError) {
      console.error("Fehler beim Speichern in steps:", stepError);
    }

    // Antwort zurückgeben
    res.json({
      recipe,
      ingredients,
      steps,
    });
  } catch (e) {
    console.error("Proxy-Fehler:", e);
    res.status(500).json({ error: "Fehler beim Importieren" });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server läuft: http://localhost:${PORT}/proxy?url=<ENCODED_URL>`);
});
