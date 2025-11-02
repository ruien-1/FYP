const fetch = require("node-fetch");

const API_KEY = process.env.SPOONACULAR_API_KEY;
const BASE_URL = "https://api.spoonacular.com/recipes";

function buildUrl(base, params) {
  const searchParams = new URLSearchParams(params);
  return `${base}?${searchParams.toString()}`;
}

function buildIntoleranceParams({ intolerances }) {
  if (!intolerances) return {};
  return {
    intolerances,
    excludeIngredients: intolerances,
  };
}

async function searchByNutrients({ type, diet, intolerances, maxCalories, maxCarbs, minProtein, number = 44 }) {
  const params = { number, apiKey: API_KEY };
  if (maxCalories) params.maxCalories = maxCalories;
  if (maxCarbs) params.maxCarbs = maxCarbs;
  if (minProtein) params.minProtein = minProtein;
  if (type) params.type = type;
  if (diet) params.diet = diet;
  Object.assign(params, buildIntoleranceParams({ intolerances }));

  const url = buildUrl(`${BASE_URL}/findByNutrients`, params);
  console.log("NutrientSearch:", url);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed nutrient search: ${res.status}`);
  return res.json();
}

function mapMealType(type) {
  if (!type) return { type: null, query: null, additionalParams: {} };
  switch (type.toLowerCase()) {
    case "breakfast": return { type: "breakfast", query: null, additionalParams: {} };
    case "lunch": return { type: "main course", query: "lunch quick easy", additionalParams: { maxReadyTime: 45, maxCalories: 600 } };
    case "dinner": return { type: "main course", query: "dinner", additionalParams: { maxReadyTime: 30, maxCalories: 400 } };
    case "snack": return { type: ["snack", "appetizer", "dessert", "fingerfood"], query: null, additionalParams: { maxReadyTime: 20, maxCalories: 300 } };
    default: return { type, query: null, additionalParams: {} };
  }
}

async function searchComplex({ type, diet, intolerances, number = 44, ...rest }) {
  const { type: mappedType, query, additionalParams } = mapMealType(type);
  const baseParams = {
    number,
    addRecipeInformation: true,
    fillIngredients: true,
    apiKey: API_KEY,
    ...rest,
    ...buildIntoleranceParams({ intolerances }),
    ...(additionalParams || {}),
  };

  if (Array.isArray(mappedType)) {
    const allResults = await Promise.all(
      mappedType.map((t) => {
        const paramsCopy = { ...baseParams, type: t };
        if (query) paramsCopy.query = query;
        if (diet) paramsCopy.diet = diet;
        const url = buildUrl(`${BASE_URL}/complexSearch`, paramsCopy);
        console.log("🔎 ComplexSearch (multi):", url);
        return fetch(url).then((res) => res.json());
      })
    );
    const merged = allResults.flatMap((r) => r.results || []);
    return { results: Array.from(new Map(merged.map((r) => [r.id, r])).values()) };
  }

  const params = { ...baseParams };
  if (mappedType) params.type = mappedType;
  if (query) params.query = query;
  if (diet) params.diet = diet;

  const url = buildUrl(`${BASE_URL}/complexSearch`, params);
  console.log("🔎 ComplexSearch:", url);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed complex search: ${res.status}`);
  return res.json();
}

async function addDetailsRecipeList(recipes, intolerances = "") {
  if (!recipes || recipes.length === 0) return [];
  const ids = recipes.map((r) => r.id).join(",");
  const url = `${BASE_URL}/informationBulk?ids=${ids}&includeNutrition=true&apiKey=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return recipes;
  const details = await res.json();

  let intoleranceList = [];
  if (intolerances) {
    intoleranceList = intolerances.split(",").map((i) => i.toLowerCase().trim());
  }

  const filtered = details.filter((r) => {
    if (!intoleranceList.length) return true;
    const ingredients = r.extendedIngredients?.map((i) => i.original.toLowerCase());
    return !ingredients?.some((ing) => intoleranceList.some((bad) => ing.includes(bad)));
  });

  return filtered.map((r) => ({
    id: r.id,
    title: r.title,
    image: r.image,
    readyInMinutes: r.readyInMinutes,
    calories: Math.round(r.nutrition?.nutrients?.find((n) => n.name === "Calories")?.amount || 0),
    protein: Math.round(r.nutrition?.nutrients?.find((n) => n.name === "Protein")?.amount || 0),
    carbs: Math.round(r.nutrition?.nutrients?.find((n) => n.name === "Carbohydrates")?.amount || 0),
    fat: Math.round(r.nutrition?.nutrients?.find((n) => n.name === "Fat")?.amount || 0),
    ingredients: r.extendedIngredients?.map((i) => i.original) || [],
    instructions: r.instructions || "",
  }));
}

module.exports = { searchByNutrients, searchComplex, addDetailsRecipeList };
