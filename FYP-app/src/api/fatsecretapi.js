// // src/api/fatsecretapi.js
// import API from "./backend";

// // 🔹 Search Foods (via backend proxy)
// export async function searchFoods(query) {
//   try {
//     console.log("⚡ Searching foods via backend:", query);

//     const res = await API.get("/api/search", {
//       params: { q: query },
//     });

//     console.log("✅ FatSecret Proxy Response:", res.data);

//     const foods = res.data.foods?.food || [];
//     const list = Array.isArray(foods) ? foods : [foods];

//     return list.map((f) => {
//       const serving = f.servings.serving[0] || f.servings.serving;
//       const brand =
//         f.brand_name ||
//         (f.food_type === "Brand" ? "Branded Food" : "Generic Food");

//       return {
//         id: f.food_id,
//         name: f.food_name,
//         brand,
//         calories: Math.round(serving.calories || 0),
//         servingSize: `${serving.number_of_units} ${serving.measurement_description}`,
//       };
//     });
//   } catch (err) {
//     console.error(
//       "❌ FatSecret proxy search error:",
//       err.response?.data || err.message
//     );
//     return [];
//   }
// }

// // 🔹 Fetch Nutrition Details (via backend proxy)
// export async function fetchNutrition(food_id) {
//   try {
//     const res = await API.get("/api/food", {
//       params: { id: food_id },
//     });

//     const food = res.data.food;
//     const serving = food.servings.serving[0] || food.servings.serving;

//     return {
//       id: food.food_id,
//       name: food.food_name,
//       brand: food.brand_name || "Generic Food",
//       calories: Math.round(serving.calories || 0),
//       protein: Math.round(serving.protein * 10) / 10,
//       carbs: Math.round(serving.carbohydrate * 10) / 10,
//       fats: Math.round(serving.fat * 10) / 10,
//       servingSize: `${serving.number_of_units} ${serving.measurement_description}`,
//     };
//   } catch (err) {
//     console.error(
//       "⚠️ FatSecret proxy fetch error:",
//       err.response?.data || err.message
//     );
//     return null;
//   }
// }
