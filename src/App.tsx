// src/App.tsx
import { useState, useEffect } from "react";
import { supabase } from "./lib/supabaseClient";

interface Recipe {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  servings: number | null;
  created_at?: string;
}

export default function App() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [url, setUrl] = useState("");

  // Rezepte aus Supabase laden
  useEffect(() => {
    const fetchRecipes = async () => {
      const { data, error } = await supabase
        .from("recipes")
        .select("id, title, description, image_url, servings, created_at")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Fehler beim Laden:", error);
      } else {
        setRecipes(data || []);
      }
    };

    fetchRecipes();
  }, []);

  // Rezept von externer URL importieren (via Proxy)
  const handleImport = async () => {
    if (!url) return;

    try {
      const resp = await fetch(
        `http://localhost:3001/proxy?url=${encodeURIComponent(url)}`
      );

      if (!resp.ok) throw new Error(`Proxy-Status: ${resp.status}`);
      const html = await resp.text();

      // Titel aus <title>
      const titleMatch = html.match(/<title>(.*?)<\/title>/i);
      const title = (titleMatch?.[1] || "Unbekanntes Rezept").trim();

      // Beschreibung als Fallback
      const description = `Importiert von ${url}`;

      // Bild via Open Graph
      const ogImgMatch = html.match(
        /<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i
      );
      const image_url = ogImgMatch?.[1] || null;

      // In Supabase speichern
      const { data, error } = await supabase
        .from("recipes")
        .insert([
          {
            title,
            description,
            image_url,
            servings: null,
          },
        ])
        .select();

      if (error) {
        console.error("Fehler beim Speichern:", error);
        alert("Fehler beim Speichern in Supabase");
        return;
      }

      alert("Rezept erfolgreich importiert!");

      // neu eingefügtes Rezept direkt ins UI pushen
      if (data) {
        setRecipes((prev) => [...data, ...prev]);
      }

      setUrl("");
    } catch (err) {
      console.error("Import-Fehler:", err);
      alert("Fehler beim Importieren der URL");
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Rezept PWA + Supabase</h1>

      <div style={{ marginBottom: "2rem" }}>
        <h2>Rezept von URL importieren</h2>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://thehiddenveggies.com/savory-vegan-muffins/"
          style={{ width: "500px", marginRight: "8px" }}
          required
        />
        <button onClick={handleImport}>Importieren</button>
      </div>

      <h2>Rezepte</h2>
      {recipes.map((r) => (
        <div
          key={r.id}
          style={{
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: 16,
            marginBottom: 12,
            maxWidth: 420,
          }}
        >
          <h3>{r.title}</h3>
          {r.image_url && (
            <img
              src={r.image_url}
              alt={r.title}
              style={{ width: "100%", borderRadius: 8 }}
            />
          )}
          {r.description && <p style={{ marginTop: 8 }}>{r.description}</p>}
          {r.servings != null && <p>Portionen: {r.servings}</p>}
        </div>
      ))}
    </div>
  );
}
