// api/usda.js
import axios from "axios";

const API_KEY = "sdbXMoFSuX1ZDs0KR5ReZtO8Rg66dtALPD2s7sTk"; // replace with your USDA API key
const BASE_URL = "https://api.nal.usda.gov/fdc/v1";

// 🔹 Helper: normalize nutrient names
function getMacroFromNutrient(name) {
  if (!name) return null;
  const n = name.toLowerCase();
  if (n.includes("energy")) return "calories";
  if (n.includes("protein")) return "protein";
  if (n.includes("fat") || n.includes("lipid")) return "fats";
  if (n.includes("carbohydrate")) return "carbs";
  return null;
}

// 🔹 Helper: format food names (capitalize words nicely)
function formatName(name) {
  if (!name) return "";
  return name
    .toLowerCase()
    .split(" ")
    .map((word) =>
      word.length > 0 ? word.charAt(0).toUpperCase() + word.slice(1) : ""
    )
    .join(" ");
}

// 🔹 Search foods (Foundation + Branded)
export async function searchFoods(query) {
  try {
    const res = await axios.get(`${BASE_URL}/foods/search`, {
      params: {
        query,
        api_key: API_KEY,
        dataType: "Foundation,Branded",
        pageSize: 50,
      },
    });

    if (!res.data?.foods) return [];

    const results = res.data.foods
      .map((item) => {
        const nutrients = {};
        (item.foodNutrients || []).forEach((n) => {
          const key = getMacroFromNutrient(n.nutrientName);
          if (key) nutrients[key] = n.value;
        });

        return {
          fdcId: item.fdcId,
          name: formatName(item.description), // ✅ formatted name
          brand: item.brandOwner || null,
          dataType: item.dataType,
          servingSize: item.servingSize || "100 g",
          ...nutrients,
        };
      })
      // ✅ only keep foods with all macros
      .filter(
        (f) =>
          f.calories !== undefined &&
          f.protein !== undefined &&
          f.fats !== undefined &&
          f.carbs !== undefined
      )
      // ✅ sort so Foundation foods appear first
      .sort((a, b) => {
        if (a.dataType === "Foundation" && b.dataType !== "Foundation") return -1;
        if (a.dataType !== "Foundation" && b.dataType === "Foundation") return 1;
        return 0;
      });

    return results;
  } catch (err) {
    console.error("❌ USDA search error:", err.response?.data || err.message);
    return [];
  }
}

// 🔹 Get detailed nutrition for a specific food
export async function getFoodDetails(fdcId) {
  try {
    const res = await axios.get(`${BASE_URL}/food/${fdcId}`, {
      params: { api_key: API_KEY },
    });

    if (!res.data) return null;

    const nutrients = {};
    (res.data.foodNutrients || []).forEach((n) => {
      const key = getMacroFromNutrient(n.nutrient?.name || n.nutrientName);
      if (key) nutrients[key] = n.amount ?? n.value;
    });

    return {
      fdcId: res.data.fdcId,
      name: formatName(res.data.description), // ✅ formatted name
      brand: res.data.brandOwner || null,
      dataType: res.data.dataType,
      servingSize: res.data.servingSize || "100 g",
      ...nutrients,
    };
  } catch (err) {
    console.error("❌ USDA food details error:", err.response?.data || err.message);
    return null;
  }
}
