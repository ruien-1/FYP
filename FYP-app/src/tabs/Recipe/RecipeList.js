import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Image,
  TextInput,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import API from "../../api/backend";
import { auth } from "../../firebaseConfig";
import LogMealModal from "./LogMealModal";
import FilterModal from "./FilterModal";
import CustomRecipeModal from "./CustomRecipeModal"; 

export default function RecipeList() {
  const navigation = useNavigation();
  const route = useRoute();
  const { category } = route.params;

  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState({});
  const [search, setSearch] = useState("");
  const [filteredResults, setFilteredResults] = useState(null);

  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState({
    popular: [],
    calories: { min: "", max: "" },
    time: { min: "", max: "" },
    diets: [],
    intolerances: [],
  });

  const [logModalVisible, setLogModalVisible] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  const [customModalVisible, setCustomModalVisible] = useState(false);
  const [modalType, setModalType] = useState("add");
  const [myRecipes, setMyRecipes] = useState([]);
  const [baseCategoryFilter, setBaseCategoryFilter] = useState(null);


  const [filterOptions, setFilterOptions] = useState({
    popular: [],
    diets: [],
    intolerances: [],
  });

  // fetch recipes from firestore
  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        const apiParams = { category: category.id || "", number: 44 };
        if (category.filterType === "type") apiParams.type = category.filterValue;
        else if (category.filterType === "diet") apiParams.diet = category.filterValue;
        else if (category.filterType === "intolerances") apiParams.intolerances = category.filterValue;

        console.log("Sending API params:", apiParams);
        const res = await API.get("/recipes", { params: apiParams });
        console.log("API response:", res.data);
        setRecipes(Array.isArray(res.data) ? res.data : []);
      } catch (error) {
        console.error("Error fetching recipes:", error.message);
        setRecipes([]);
      } finally {
        setLoading(false);
      }
    };
    fetchRecipes();
  }, [category]);

  //fetch filter options from firestore
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const res = await API.get("/filteroptions");
        console.log("✅ Filter options:", res.data);
        setFilterOptions(res.data || { popular: [], diets: [], intolerances: [] });
      } catch (error) {
        console.error("❌ Error fetching filter options:", error.message);
      }
    };
    fetchFilterOptions();
  }, []);

  //refresh the favorites in recipelist.js
  useFocusEffect(
    React.useCallback(() => {
      fetchFavorites();
    }, [])
  );


  // Auto-select filter based on chosen category
useEffect(() => {
  if (category) {
    let baseFilter = null;

    if (category.filterType === "diet") {
      baseFilter = { diets: [category.filterValue] };
    } else if (category.filterType === "intolerances") {
      baseFilter = { intolerances: [category.filterValue] };
    } else if (category.filterType === "type") {
      baseFilter = { popular: [category.filterValue] };
    }

    setBaseCategoryFilter(baseFilter);

    setSelectedFilters((prev) => ({
      ...prev,
      ...baseFilter, // ensure category is always there
    }));
  }
}, [category]);


  //fetch favorites from firestore
  const fetchFavorites = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const res = await API.get(`/favorites/${user.uid}`);
      const favsObj = {};
      res.data.forEach((r) => { favsObj[r.id] = r; });
      setFavorites(favsObj);
    } catch (error) {
      console.error(" Error fetching favorites:", error.message);
    }
  };

  // add and remove favorite from user's favorite
  const toggleFavorite = async (recipe) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not logged in");
      const exists = !!favorites[recipe.id];
      if (exists) await API.delete(`/favorites/${user.uid}/${recipe.id}`);
      else await API.post(`/favorites/${user.uid}`, recipe);
      await fetchFavorites();
    } catch (error) {
      console.error("Error toggling favorite:", error.message);
    }
  };

  // log recipe to diary
  const LogToDiary = async (recipe, mealType, servings = 1) => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error("User not logged in");
      const res = await API.get(`/recipeDetails/${recipe.id}`);
      const fullRecipe = res.data;
      const today = new Date().toISOString().split("T")[0];
      const mealLog = {
        mealType,
        date: today,
        food: fullRecipe.title,
        servingSize: fullRecipe.servingSize || "1 serving",
        servings,
        calories: fullRecipe.calories * servings,
        protein: fullRecipe.protein * servings,
        carbs: fullRecipe.carbs * servings,
        fats: fullRecipe.fat * servings,
        source: "recipe",
        recipeId: fullRecipe.id,
      };
      const postRes = await API.post(`/meals_log/${uid}`, mealLog);
      if (postRes.data.success) {
        console.log("Meal logged:", postRes.data.meal);
        setSuccessMessage(`"${fullRecipe.title}" logged successfully!`);
        setTimeout(() => setSuccessMessage(""), 3000);
      }
    } catch (err) {
      console.error("Error logging meal:", err);
      setSuccessMessage("Failed to log meal. Please try again.");
      setTimeout(() => setSuccessMessage(""), 3000);
    }
  };

  //for filtered results
  const searchedFilteredResults = filteredResults
    ? Object.keys(filteredResults).reduce((acc, section) => {
        const sectionRecipes = filteredResults[section].filter((recipe) =>
          recipe.title.toLowerCase().includes(search.toLowerCase())
        );
        if (sectionRecipes.length > 0) acc[section] = sectionRecipes;
        return acc;
      }, {})
    : null;

  // for search button
  const filteredRecipes = recipes.filter((recipe) =>
    recipe.title.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#000" />
      </SafeAreaView>
    );
  }

  //display recipes after filtered
  const displayRecipes = searchedFilteredResults
    ? (() => {
        const allRecipes = Object.values(searchedFilteredResults).flat();
        const seen = new Set();
        const deduplicated = allRecipes.filter(recipe => {
          if (seen.has(recipe.id)) return false;
          seen.add(recipe.id);
          return true;
        });
        return deduplicated.slice(0, 10);
      })()
    : filteredRecipes.slice(0, 10);

  return (
    <SafeAreaView style={styles.safeArea}>
      {successMessage ? (
        <View style={styles.toastMessageBox}>
          <Text style={styles.toastMessageText}>{successMessage}</Text>
        </View>
      ) : null}


      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        selectedFilters={selectedFilters}
        setSelectedFilters={setSelectedFilters}
        filterOptions={filterOptions}
        setFilteredResults={setFilteredResults}
      />

      <CustomRecipeModal
        modalVisible={customModalVisible}
        setModalVisible={setCustomModalVisible}
        modalType={modalType}
        setModalType={setModalType}
        myRecipes={myRecipes}
        setMyRecipes={setMyRecipes}
        selectedRecipe={selectedRecipe}
        setSelectedRecipe={setSelectedRecipe}
        uid={auth.currentUser?.uid}
      />

      <FlatList
        data={displayRecipes}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: "space-between" }}
        contentContainerStyle={styles.scrollContent}
        ListHeaderComponent={
          <>
            <View style={styles.headerRow}>
              <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <Ionicons name="chevron-back" size={24} color="#000" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Recipes</Text>
              <View style={{ width: 24 }} />
            </View>

            <View style={styles.topRow}>
              <View style={styles.searchContainer}>
                <Ionicons name="search-outline" size={18} color="#888" style={{ marginHorizontal: 6 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search"  
                  value={search}
                  onChangeText={setSearch}
                />
              </View>
              <TouchableOpacity style={styles.filterBtn} onPress={() => setFilterModalVisible(true)}>
                <Ionicons name="filter-outline" size={18} color="#000" />
                <Text style={styles.filterText}>Filter</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate("FavRecipes")}>
                <Text>⭐ Favorites</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => {
                  setModalType("add");
                  setCustomModalVisible(true);
                }}
              >
                <Text>＋ Add Recipe</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => {
                  setModalType("list");
                  setCustomModalVisible(true);
                }}
              >
                <Text>📖 My Recipes</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {filteredResults ? "Filtered Results:" : (category?.label || category?.category || "Recipes")}
              </Text>

              {filteredResults && (
                <View style={styles.filterPillsContainer}>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterPillsScroll}
                  >
{selectedFilters.popular
  .filter((filter) => !(baseCategoryFilter?.popular || []).includes(filter))
  .map((filter) => (
    <View key={`pill-popular-${filter}`} style={styles.filterPill}>
      <Text style={styles.filterPillText}>{filter}</Text>
    </View>
))}
{selectedFilters.diets
  .filter((diet) => !(baseCategoryFilter?.diets || []).includes(diet))
  .map((diet) => (
    <View key={`pill-diet-${diet}`} style={styles.filterPill}>
      <Text style={styles.filterPillText}>{diet}</Text>
    </View>
))}
{selectedFilters.intolerances
  .filter((intol) => !(baseCategoryFilter?.intolerances || []).includes(intol))
  .map((intol) => (
    <View key={`pill-intol-${intol}`} style={styles.filterPill}>
      <Text style={styles.filterPillText}>{intol}</Text>
    </View>
))}

                    {(selectedFilters.calories.min || selectedFilters.calories.max) && (
                      <View style={styles.filterPill}>
                        <Text style={styles.filterPillText}>
                          {selectedFilters.calories.min || '0'}-{selectedFilters.calories.max || '∞'} kcal
                        </Text>
                      </View>
                    )}
                    {(selectedFilters.time.min || selectedFilters.time.max) && (
                      <View style={styles.filterPill}>
                        <Text style={styles.filterPillText}>
                          {selectedFilters.time.min || '0'}-{selectedFilters.time.max || '∞'} min
                        </Text>
                      </View>
                    )}
                    
                    <TouchableOpacity 
                      style={styles.clearFiltersBtn}
                      onPress={() => {
                        setSelectedFilters({
                          popular: baseCategoryFilter?.popular || [],
                          calories: { min: "", max: "" },
                          time: { min: "", max: "" },
                          diets: baseCategoryFilter?.diets || [],
                          intolerances: baseCategoryFilter?.intolerances || [],
                        });
                        setFilteredResults(null);
                      }}
                    >
                      <Text style={styles.clearFiltersBtnText}>Clear All</Text>
                    </TouchableOpacity>

                  </ScrollView>
                </View>
              )}

              <View style={{ alignItems: "flex-end" }}>
                <TouchableOpacity
                  style={styles.seeAllBtn}
                  onPress={() => {
                    let allRecipes = [];
                    
                    if (searchedFilteredResults) {
                      const recipes = Object.values(searchedFilteredResults).flat();
                      const seen = new Set();
                      allRecipes = recipes.filter(recipe => {
                        if (seen.has(recipe.id)) return false;
                        seen.add(recipe.id);
                        return true;
                      });
                    } else {
                      allRecipes = filteredRecipes;
                    }

                    const displayedIds = new Set(displayRecipes.map(r => r.id));
                    const remainingRecipes = allRecipes.filter(r => !displayedIds.has(r.id));

                    console.log(`Total recipes: ${allRecipes.length}, Displayed: ${displayRecipes.length}, Remaining: ${remainingRecipes.length}`);

                    navigation.navigate("ViewMoreRecipes", {
                      allRecipes: remainingRecipes,
                      category,
                      fromFilter: !!searchedFilteredResults,
                      sectionName: searchedFilteredResults 
                        ? Object.keys(searchedFilteredResults)[0] 
                        : null,
                    });
                  }}
                >
                  <Text style={styles.seeAllText}>See All Recipes →</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { width: "48%" }]}>
            <TouchableOpacity onPress={() => navigation.navigate("RecipeDetail", { id: item.id })}>
              {item.image ? (
                <Image source={{ uri: item.image }} style={styles.image} />
              ) : (
                <View style={styles.placeholderImage}>
                  <Text style={styles.placeholderText}>🍽️</Text>
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.actionButton} onPress={() => toggleFavorite(item)}>
                <Ionicons
                  name={favorites[item.id] ? "star" : "star-outline"}
                  size={18}
                  color={favorites[item.id] ? "#FFD700" : "#333"}
                />
                <Text style={styles.actionText}>
                  {favorites[item.id] ? "Favorited" : "Favorite"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  setSelectedRecipe(item);
                  setLogModalVisible(true);
                }}
              >
                <Ionicons name="restaurant-outline" size={18} color="#333" />
                <Text style={styles.actionText}>Log to Diary</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.info}>
              <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
              <View style={styles.row}>
                <Text style={styles.meta}>{item.calories || 0} kcal</Text>
                <Text style={styles.meta}>{item.readyInMinutes || 0} min</Text>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.noRecipesContainer}>
            <Text style={styles.noRecipesText}>No recipes found.</Text>
            <Text style={styles.noRecipesSubtext}>
              Try adjusting your search or category selection.
            </Text>
          </View>
        }
      />

      <LogMealModal
        visible={logModalVisible}
        onClose={() => setLogModalVisible(false)}
        recipe={selectedRecipe}
        onLog={(recipe, mealType, servings) => LogToDiary(recipe, mealType, servings, setSuccessMessage)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#E8F0FF" },
  scrollContent: { padding: 12 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  backButton: { padding: 4 },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 30, fontWeight: "bold", color: "#000" },
  topRow: { flexDirection: "row", marginBottom: 12, alignItems: "center" },
  searchContainer: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderWidth: 1, borderColor: "#ddd", borderRadius: 10, paddingHorizontal: 4 },
  searchInput: { flex: 1, paddingVertical: 8, paddingHorizontal: 4 },
  filterBtn: { flexDirection: "row", alignItems: "center", marginLeft: 10, backgroundColor: "#fff", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, elevation: 2 },
  filterText: { marginLeft: 6, fontSize: 14, fontWeight: "500" },
  actionRow: { flexDirection: "row", marginBottom: 16, flexWrap: "wrap" },
  actionBtn: { flex: 1, padding: 10, margin: 4, borderRadius: 8, backgroundColor: "#fff", alignItems: "center", elevation: 1 },
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8},
  sectionTitle: { marginTop: 15, fontSize: 30, fontWeight: "bold" },
  seeAllBtn: { marginTop: 0},
  seeAllText: { color: "#007bff", fontSize: 15, fontWeight: "500" },
  card: { marginBottom: 16, backgroundColor: "#fff", borderRadius: 16, overflow: "hidden", elevation: 3 },
  image: { width: "100%", height: 120, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  placeholderImage: { width: "100%", height: 120, backgroundColor: "#f0f0f0", justifyContent: "center", alignItems: "center" },
  placeholderText: { fontSize: 40 },
  info: { paddingHorizontal: 10, paddingTop: 6, paddingBottom: 8, backgroundColor: "#fff" },
  cardTitle: { fontSize: 14, fontWeight: "600", marginBottom: 4, color: "#222" },
  row: { flexDirection: "row", justifyContent: "space-between" },
  meta: { fontSize: 12, color: "#666" },
  actionsRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 10, paddingTop: 8, paddingBottom: 4 },
  actionButton: { flexDirection: "row", alignItems: "center" },
  actionText: { marginLeft: 4, fontSize: 12, color: "#333" },
  successMessageBox: { backgroundColor: "#d4edda", padding: 10, margin: 10, borderRadius: 8 },
  successMessageText: { color: "#155724", textAlign: "center" },
  filterPillsContainer: { marginVertical: 10},
  filterPillsScroll: { flexDirection: "row", alignItems: "center" },
  filterPill: { backgroundColor: "#007bff", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, marginRight: 8 },
  filterPillText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  clearFiltersBtn: { backgroundColor: "#dc3545", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  clearFiltersBtnText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  noRecipesContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  noRecipesText: { fontSize: 18, fontWeight: "600", marginBottom: 6 },
  noRecipesSubtext: { fontSize: 14, color: "#666", textAlign: "center" },
  toastMessageBox: {
  position: "absolute",
  top: 50,
  left: 20,
  right: 20,
  backgroundColor: "#28a745",
  paddingVertical: 12,
  paddingHorizontal: 16,
  borderRadius: 25,
  elevation: 5,
  zIndex: 1000,
  alignItems: "center",
},
toastMessageText: {
  color: "#fff",
  fontSize: 14,
  fontWeight: "600",
  textAlign: "center",
},

});
