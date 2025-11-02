// FYP-app-backend/nutritionix.js
const APP_ID = "9a66f45d"; 
const API_KEY = "aabcb0ac06101c8232fb5f1ff06361ce"; // replace with your Nutritionix API Key
const BASE_URL = "https://trackapi.nutritionix.com/v2";

// 🔹 Quick search (generic + branded foods)
export async function searchFoods(query) {
  try {
    const res = await fetch(
      `${BASE_URL}/search/instant?query=${encodeURIComponent(query)}`,
      {
        headers: {
          "x-app-id": APP_ID,
          "x-app-key": API_KEY,
        },
      }
    );

    const data = await res.json();

    return {
      generic: data.common || [],   // "Generic" / free foods
      branded: data.branded || [], // Packaged / branded foods
    };
  } catch (e) {
    console.error("Nutritionix search error:", e);
    return { generic: [], branded: [] };
  }
}

// 🔹 Fetch detailed nutrition (calories, macros, etc.) 
// for free-text queries (e.g., "2 eggs and toast")
export async function fetchNutrition(query) {
  try {
    const response = await fetch(`${BASE_URL}/natural/nutrients`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-app-id": APP_ID,
        "x-app-key": API_KEY,
      },
      body: JSON.stringify({ query }),
    });

    const data = await response.json();
    return data.foods || []; // array of food items with full macros
  } catch (error) {
    console.error("Nutritionix fetch error:", error);
    return [];
  }
}
