import { useState, useEffect } from "react";
import { supabase } from "./lib/supabaseClient";

interface Recipe {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  servings: number | null;
}

interface Ingredient {
  id: string;
  recipe_id: string;
  name: string;
  position: number;
}

interface Step {
  id: string;
  recipe_id: string;
  description: string;
  position: number;
}

export default function App() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<Record<string, Ingredient[]>>(
    {}
  );
  const [steps, setSteps] = useState<Record<string, Step[]>>({});
  const [url, setUrl] = useState("");

  // Alle Rezepte laden
  useEffect(() => {
    const fetchRecipes = async () => {
      const { data: recipeData, error } = await supabase
        .from("recipes")
        .select("id, title, description, image_url, servings")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Fehler beim Laden der Rezepte:", error);
      } else {
        setRecipes(recipeData || []);
      }
    };

    fetchRecipes();
  }, []);

  // Zutaten + Schritte für ein Rezept laden
  const fetchDetails = async (recipeId: string) => {
    const { data: ingData } = await supabase
      .from("ingredients")
      .select("*")
      .eq("recipe_id", recipeId)
      .order("position");

    const { data: stepData } = await supabase
      .from("steps")
      .select("*")
      .eq("recipe_id", recipeId)
      .order("position");

    setIngredients((prev) => ({ ...prev, [recipeId]: ingData || [] }));
    setSteps((prev) => ({ ...prev, [recipeId]: stepData || [] }));
  };

  // Rezept von URL importieren
  const handleImport = async () => {
    if (!url) return;

    try {
      const resp = await fetch(
        `http://localhost:3001/proxy?url=${encodeURIComponent(url)}`
      );

      if (!resp.ok) throw new Error(`Proxy-Status: ${resp.status}`);
      const html = await resp.text(); // <-- WICHTIG: jetzt text statt json

      // Titel aus <title>
      const titleMatch = html.match(/<title>(.*?)<\/title>/i);
      const title = (titleMatch?.[1] || "Unbekanntes Rezept").trim();

      // Dummy-Beschreibung
      const description = `Importiert von ${url}`;

      // Open Graph Bild extrahieren
      const ogImgMatch = html.match(
        /<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i
      );
      const image_url = ogImgMatch?.[1] || null;

      // In Supabase speichern
      const { data, error } = await supabase
        .from("recipes")
        .insert([{ title, description, image_url, servings: null }])
        .select();

      if (error) {
        console.error("Fehler beim Speichern in Supabase:", error);
        alert("Fehler beim Speichern in Supabase");
        return;
      }

      // State aktualisieren
      if (data && data.length > 0) {
        setRecipes((prev) => [data[0], ...prev]);
      }

      setUrl("");
      alert("Rezept erfolgreich importiert!");
    } catch (err) {
      console.error("Import-Fehler:", err);
      alert("Fehler beim Importieren. Details in der Konsole.");
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
          placeholder="https://example.com/rezept-url"
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
            marginBottom: 20,
            maxWidth: 600,
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
          {r.description && <p>{r.description}</p>}
          {r.servings != null && <p>Portionen: {r.servings}</p>}

          <button
            style={{ marginTop: "10px" }}
            onClick={() => fetchDetails(r.id)}
          >
            Zutaten & Schritte laden
          </button>

          {/* Zutaten */}
          {ingredients[r.id] && (
            <div style={{ marginTop: "1rem" }}>
              <h4>Zutaten</h4>
              <ul>
                {ingredients[r.id].map((ing) => (
                  <li key={ing.id}>{ing.name}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Schritte */}
          {steps[r.id] && (
            <div style={{ marginTop: "1rem" }}>
              <h4>Zubereitung</h4>
              <ol>
                {steps[r.id].map((s) => (
                  <li key={s.id}>{s.description}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
