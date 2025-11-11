const APP_ID = "9a66f45d"; 
const API_KEY = "aabcb0ac06101c8232fb5f1ff06361ce"; 
const BASE_URL = "https://trackapi.nutritionix.com/v2";

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
      generic: data.common || [],   
      branded: data.branded || [], 
    };
  } catch (e) {
    return { generic: [], branded: [] };
  }
}

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
    return data.foods || []; 
  } catch (error) {
    return [];
  }
}
