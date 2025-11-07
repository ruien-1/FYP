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
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import API from "../../api/backend";
import { auth, db } from "../../firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { Alert } from "react-native";
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

  // Membership status
  const [membership, setMembership] = useState("free");

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
      // Refresh membership on focus
      const fetchMembership = async () => {
        try {
          const user = auth.currentUser;
          if (!user) return;
          const userRef = doc(db, "user", user.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const userData = userSnap.data();
            setMembership(userData.membership || "free");
          }
        } catch (error) {
          console.error("Error fetching membership:", error);
        }
      };
      fetchMembership();
    }, [])
  );

  // Fetch membership status on mount
  useEffect(() => {
    const fetchMembership = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;
        const userRef = doc(db, "user", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          setMembership(userData.membership || "free");
        }
      } catch (error) {
        console.error("Error fetching membership:", error);
      }
    };
    fetchMembership();
  }, []);

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
        ...baseFilter,
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
        <ActivityIndicator size="large" color="#4A90E2" />
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
    <SafeAreaView style={styles.safeArea} edges={['top']}>
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
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Header */}
            <View style={styles.headerRow}>
              <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <Ionicons name="chevron-back" size={26} color="#333" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Recipes</Text>
              <View style={styles.headerSpacer} />
            </View>

            {/* Search and Filter */}
            <View style={styles.topRow}>
              <View style={styles.searchContainer}>
                <Ionicons name="search-outline" size={20} color="#888" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search recipes..."  
                  value={search}
                  onChangeText={setSearch}
                  placeholderTextColor="#999"
                />
              </View>
              <TouchableOpacity style={styles.filterBtn} onPress={() => setFilterModalVisible(true)}>
                <Ionicons name="filter-outline" size={20} color="#333" />
                <Text style={styles.filterText}>Filter</Text>
              </TouchableOpacity>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionRow}>
              <TouchableOpacity 
                style={styles.actionBtn} 
                onPress={() => navigation.navigate("FavRecipes")}
              >
                <Ionicons name="star" size={18} color="#FFD700" />
                <Text style={styles.actionBtnText}>Favorites</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, membership !== "premium" && styles.actionBtnLocked]}
                onPress={() => {
                  if (membership !== "premium") {
                    Alert.alert(
                      "Premium Feature",
                      "Sign up for Premium to unlock this feature!",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Upgrade",
                          onPress: () => navigation.navigate("UpgradePremium"),
                        },
                      ]
                    );
                    return;
                  }
                  setModalType("add");
                  setCustomModalVisible(true);
                }}
              >
                <View style={{ position: "relative" }}>
                  <Ionicons name="add-circle-outline" size={18} color={membership !== "premium" ? "#999" : "#4A90E2"} />
                  {membership !== "premium" && (
                    <View style={styles.lockIconOverlay}>
                      <Ionicons name="lock-closed" size={10} color="#fff" />
                    </View>
                  )}
                </View>
                <Text style={[styles.actionBtnText, membership !== "premium" && styles.actionBtnTextLocked]}>
                  Add Recipe
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, membership !== "premium" && styles.actionBtnLocked]}
                onPress={() => {
                  if (membership !== "premium") {
                    Alert.alert(
                      "Premium Feature",
                      "Sign up for Premium to unlock this feature!",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Upgrade",
                          onPress: () => navigation.navigate("UpgradePremium"),
                        },
                      ]
                    );
                    return;
                  }
                  setModalType("list");
                  setCustomModalVisible(true);
                }}
              >
                <View style={{ position: "relative" }}>
                  <Ionicons name="book-outline" size={18} color={membership !== "premium" ? "#999" : "#4A90E2"} />
                  {membership !== "premium" && (
                    <View style={styles.lockIconOverlay}>
                      <Ionicons name="lock-closed" size={10} color="#fff" />
                    </View>
                  )}
                </View>
                <Text style={[styles.actionBtnText, membership !== "premium" && styles.actionBtnTextLocked]}>
                  My Recipes
                </Text>
              </TouchableOpacity>
            </View>

            {/* Section Title and Filters */}
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>
                  {filteredResults ? "Filtered Results" : (category?.label || category?.category || "Recipes")}
                </Text>
              </View>

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
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <TouchableOpacity 
              onPress={() => navigation.navigate("RecipeDetail", { id: item.id })}
              activeOpacity={0.8}
            >
              {item.image ? (
                <Image source={{ uri: item.image }} style={styles.image} />
              ) : (
                <View style={styles.placeholderImage}>
                  <Text style={styles.placeholderText}>🍽️</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Card Content */}
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
              
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Ionicons name="flame-outline" size={14} color="#FF6B6B" />
                  <Text style={styles.metaText}>{item.calories || 0} kcal</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={14} color="#4A90E2" />
                  <Text style={styles.metaText}>{item.readyInMinutes || 0} min</Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.cardActions}>
                <TouchableOpacity 
                  style={styles.cardActionBtn} 
                  onPress={() => toggleFavorite(item)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={favorites[item.id] ? "star" : "star-outline"}
                    size={18}
                    color={favorites[item.id] ? "#FFD700" : "#666"}
                  />
                  <Text style={[
                    styles.cardActionText,
                    favorites[item.id] && styles.cardActionTextActive
                  ]}>
                    {favorites[item.id] ? "Saved" : "Save"}
                  </Text>
                </TouchableOpacity>

                <View style={styles.cardActionDivider} />

                <TouchableOpacity
                  style={styles.cardActionBtn}
                  onPress={() => {
                    setSelectedRecipe(item);
                    setLogModalVisible(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add-circle-outline" size={18} color="#4A90E2" />
                  <Text style={styles.cardActionText}>Log</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.noRecipesContainer}>
            <Ionicons name="restaurant-outline" size={60} color="#CCC" />
            <Text style={styles.noRecipesText}>No recipes found</Text>
            <Text style={styles.noRecipesSubtext}>
              Try adjusting your search or filters
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
  safeArea: { 
    flex: 1, 
    backgroundColor: "#E8F0FF",
  },
  scrollContent: { 
    padding: 16,
    paddingBottom: 24,
  },
  center: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center",
    backgroundColor: "#E8F0FF",
  },
  
  // Header
  headerRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  backButton: { 
    padding: 8,
    marginRight: 8,
  },
  headerTitle: { 
    flex: 1, 
    fontSize: 28, 
    fontWeight: "700", 
    color: "#333",
    includeFontPadding: false,
  },
  headerSpacer: { 
    width: 42,
  },
  
  // Search and Filter
  topRow: { 
    flexDirection: "row", 
    marginBottom: 16, 
    alignItems: "center",
    gap: 10,
  },
  searchContainer: { 
    flex: 1, 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: "#fff", 
    borderRadius: 12, 
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'android' ? 4 : 10,
    ...Platform.select({
      android: {
        elevation: 2,
      },
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
    }),
  },
  searchInput: { 
    flex: 1, 
    fontSize: 15,
    color: "#333",
    paddingVertical: 8,
    paddingLeft: 8,
    includeFontPadding: false,
  },
  filterBtn: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: "#fff", 
    borderRadius: 12, 
    paddingHorizontal: 14, 
    paddingVertical: 10,
    gap: 6,
    ...Platform.select({
      android: {
        elevation: 2,
      },
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
    }),
  },
  filterText: { 
    fontSize: 14, 
    fontWeight: "600",
    color: "#333",
  },
  
  // Action Buttons Row
  actionRow: { 
    flexDirection: "row", 
    marginBottom: 20,
    gap: 8,
  },
  actionBtn: { 
    flex: 1, 
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12, 
    borderRadius: 10, 
    backgroundColor: "#fff",
    gap: 6,
    ...Platform.select({
      android: {
        elevation: 2,
      },
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
    }),
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },
  actionBtnLocked: {
    opacity: 0.6,
  },
  actionBtnTextLocked: {
    color: "#999",
  },
  lockIconOverlay: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#FF6B6B",
    borderRadius: 6,
    width: 14,
    height: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fff",
  },
  
  // Section
  section: { 
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: { 
    fontSize: 22, 
    fontWeight: "700",
    color: "#333",
    includeFontPadding: false,
  },
  seeAllBtn: {
    alignSelf: "flex-end",
    paddingVertical: 8,
  },
  seeAllText: { 
    color: "#4A90E2", 
    fontSize: 14, 
    fontWeight: "600",
  },
  
  // Filter Pills
  filterPillsContainer: { 
    marginBottom: 12,
  },
  filterPillsScroll: { 
    flexDirection: "row", 
    alignItems: "center",
    gap: 8,
  },
  filterPill: { 
    backgroundColor: "#4A90E2", 
    paddingHorizontal: 12, 
    paddingVertical: 7, 
    borderRadius: 20,
  },
  filterPillText: { 
    color: "#fff", 
    fontSize: 12, 
    fontWeight: "600",
  },
  clearFiltersBtn: { 
    backgroundColor: "#FF6B6B", 
    paddingHorizontal: 12, 
    paddingVertical: 7, 
    borderRadius: 20,
  },
  clearFiltersBtnText: { 
    color: "#fff", 
    fontSize: 12, 
    fontWeight: "600",
  },
  
  // Recipe Cards
  columnWrapper: {
    justifyContent: "space-between",
    gap: 12,
  },
  card: { 
    width: "48%",
    marginBottom: 16, 
    backgroundColor: "#fff", 
    borderRadius: 14, 
    overflow: "hidden",
    ...Platform.select({
      android: {
        elevation: 3,
      },
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
    }),
  },
  image: { 
    width: "100%", 
    height: 120,
  },
  placeholderImage: { 
    width: "100%", 
    height: 120, 
    backgroundColor: "#f5f5f5", 
    justifyContent: "center", 
    alignItems: "center",
  },
  placeholderText: { 
    fontSize: 40,
  },
  
  // Card Content
  cardContent: {
    padding: 12,
  },
  cardTitle: { 
    fontSize: 14, 
    fontWeight: "600", 
    color: "#333",
    marginBottom: 8,
    minHeight: 36,
    includeFontPadding: false,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  
  // Card Actions
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    marginHorizontal: -12,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  cardActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 4,
  },
  cardActionDivider: {
    width: 1,
    height: 20,
    backgroundColor: "#F0F0F0",
  },
  cardActionText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "600",
  },
  cardActionTextActive: {
    color: "#FFD700",
  },
  
  // Empty State
  noRecipesContainer: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center", 
    paddingVertical: 60,
  },
  noRecipesText: { 
    fontSize: 18, 
    fontWeight: "600", 
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  noRecipesSubtext: { 
    fontSize: 14, 
    color: "#999", 
    textAlign: "center",
  },
  
  // Toast Message
  toastMessageBox: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: "#28a745",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    zIndex: 1000,
    alignItems: "center",
    ...Platform.select({
      android: {
        elevation: 8,
      },
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
    }),
  },
  toastMessageText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
});