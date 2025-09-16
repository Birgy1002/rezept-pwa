import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

interface Ingredient {
  name: string;
}

interface Step {
  description: string;
}

export default function ImportFormReal() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<{
    title: string;
    image_url: string;
    ingredients: Ingredient[];
    steps: Step[];
  } | null>(null);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Wir nutzen einen gratis CORS-Proxy, z. B. cors-anywhere oder ein eigenes Proxy
      const resp = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`);
      const html = await resp.text();

      // Einfaches Parsen mit DOMParser
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      // Titel
      const titleEl = doc.querySelector("h1");
      const title = titleEl ? titleEl.textContent?.trim() || "" : "";

      // Bild
      const imgEl = doc.querySelector("img");
      const image_url = imgEl ? imgEl.getAttribute("src") || "" : "";

      // Zutaten (Elements in "Ingredients" section)
      const ingredients: Ingredient[] = [];
      const ingredientsEls = Array.from(doc.querySelectorAll("ul li"));
      ingredientsEls.forEach((li) => {
        const txt = li.textContent?.trim();
        if (txt && txt.length > 2) {
          ingredients.push({ name: txt });
        }
      });

      // Schritte (Elements in "Instructions" section)
      const steps: Step[] = [];
      const stepsEls = Array.from(doc.querySelectorAll("ol li, div[id*='how'], div[class*='instruction'], div[class*='step']"));
      stepsEls.forEach((el) => {
        const txt = el.textContent?.trim();
        if (txt && txt.length > 5) {
          steps.push({ description: txt });
        }
      });

      setPreview({ title, image_url, ingredients, steps });
    } catch (err: any) {
      console.error("Import-Fehler:", err.message);
      alert("Fehler beim Importieren der URL");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!preview) return;

    // Rezept speichern
    const { data: recipeData, error: recipeError } = await supabase.from("recipes").insert([
      {
        user_id: "bb61b4b3-1831-44cc-a4fd-40baf6c0afa8",
        title: preview.title,
        description: "",
        image_url: preview.image_url,
        servings: null,
      },
    ]).select("id");

    if (recipeError || !recipeData || recipeData.length === 0) {
      alert("Fehler beim Speichern des Rezepts");
      return;
    }

    const recipe = recipeData[0];

    // Zutaten speichern
    const ingredInserts = preview.ingredients.map((ing) => ({
      recipe_id: recipe.id,
      name: ing.name,
      amount: null,
      unit: null,
      is_staple: false,
    }));

    const { error: ingredError } = await supabase.from("ingredients").insert(ingredInserts);
    if (ingredError) {
      console.error("Ingredient Save Error", ingredError.message);
    }

    // Schritte speichern
    const stepsInserts = preview.steps.map((st, idx) => ({
      recipe_id: recipe.id,
      position: idx + 1,
      description: st.description,
      time_minutes: null,
    }));

    const { error: stepError } = await supabase.from("steps").insert(stepsInserts);
    if (stepError) {
      console.error("Step Save Error", stepError.message);
    }

    alert("Rezept importiert und gespeichert!");
    setPreview(null);
    setUrl("");
  };

  return (
    <div style={{ margin: "2rem 0" }}>
      <h3>Rezept von URL importieren</h3>
      <form onSubmit={handleImport}>
        <input
          type="text"
          placeholder="Rezept-URL eingeben"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          style={{ width: "400px", marginRight: "10px" }}
        />
        <button type="submit" disabled={loading}>
          {loading ? "Importiere..." : "Import starten"}
        </button>
      </form>

      {preview && (
        <div style={{ border: "1px solid #ccc", padding: "1rem", marginTop: "1rem" }}>
          <h4>{preview.title}</h4>
          {preview.image_url && <img src={preview.image_url} alt={preview.title} style={{ width: "200px" }} />}
          <h5>Zutaten:</h5>
          <ul>
            {preview.ingredients.map((ing, i) => <li key={i}>{ing.name}</li>)}
          </ul>
          <h5>Schritte:</h5>
          <ol>
            {preview.steps.map((st, i) => <li key={i}>{st.description}</li>)}
          </ol>
          <button onClick={handleSave}>In Supabase speichern</button>
        </div>
      )}
    </div>
  );
}
