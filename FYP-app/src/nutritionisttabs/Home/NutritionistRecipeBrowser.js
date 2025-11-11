import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Image,
  TextInput,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, CommonActions } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import API from "../../api/backend";
import FilterModal from "../../tabs/Recipe/FilterModal";

export default function NutritionistRecipeBrowser() {
  const navigation = useNavigation();
  const route = useRoute();
  const { mealPlan, selectedMealTime, returnToKey } = route.params || {};

  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        const res = await API.get("/recipes", { params: { number: 44 } });
        setRecipes(Array.isArray(res.data) ? res.data : []);
      } catch (error) {
        setRecipes([]);
      } finally {
        setLoading(false);
      }
    };
    fetchRecipes();
  }, []);

  const filteredRecipes = useMemo(() => {
    const base = filteredResults ? Object.values(filteredResults).flat() : recipes;
    const seen = new Set();
    const deduped = base.filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });
    return deduped.filter((r) => (r.title || "").toLowerCase().includes(search.toLowerCase()));
  }, [recipes, filteredResults, search]);

  const assignRecipeToMealPlan = async (recipe) => {
    try {
      const res = await API.get(`/recipeDetails/${recipe.id}`);
      const full = res.data || {};
      let steps = [];
      if (full.instructions) {
        let cleaned = full.instructions.replace(/<[^>]+>/g, "").trim();
        cleaned = cleaned.replace(/^instructions[:\-]?\s*/i, "");
        if (/^\d+\./.test(cleaned)) {
          steps = cleaned.split(/\s*\d+\.\s*/).filter((s) => s.trim().length > 0);
        } else {
          steps = cleaned
            .replace(/([.?!])(?=[A-Z])/g, "$1 ")
            .split(/(?<=[.!?])\s+/)
            .filter((s) => s.trim().length > 0);
        }
        steps = steps.filter((s) => !/^instructions?$/i.test(s.trim()));
      }

      const mealFromRecipe = {
        food: full.title || recipe.title || "Recipe",
        servings: "1",
        amount: String(full.servingSizeAmount || 1),
        calories: String(full.calories || recipe.calories || 0),
        protein: String(full.protein || 0),
        carbs: String(full.carbs || 0),
        fats: String(full.fat || 0),
        recipeId: full.id || recipe.id,
        ingredients: Array.isArray(full.ingredients) ? full.ingredients : [],
        instructions: steps,
      };

      if (returnToKey) {
        const action = CommonActions.setParams({ assignedRecipe: mealFromRecipe, selectedMealTime });
        navigation.dispatch({ ...action, source: returnToKey });
        navigation.goBack();
      } else {
        navigation.navigate("CreateMealPlan", { assignedRecipe: mealFromRecipe, selectedMealTime, mealPlan });
      }
    } catch (err) {
      Alert.alert("Error", "Failed to retrieve recipe details.");
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <FlatList
        data={filteredRecipes}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <View style={styles.headerRow}>
              <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <Ionicons name="chevron-back" size={26} color="#333" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Browse Recipes</Text>
              <View style={styles.headerSpacer} />
            </View>

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
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <TouchableOpacity onPress={() => navigation.navigate("RecipeDetail", { id: item.id })} activeOpacity={0.8}>
              {item.image ? (
                <Image source={{ uri: item.image }} style={styles.image} />
              ) : (
                <View style={styles.placeholderImage}>
                  <Text style={styles.placeholderText}>🍽️</Text>
                </View>
              )}
            </TouchableOpacity>

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

              <TouchableOpacity style={styles.assignBtn} onPress={() => assignRecipeToMealPlan(item)}>
                <Ionicons name="person-add-outline" size={18} color="#fff" />
                <Text style={styles.assignBtnText}>Assign to user</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.noRecipesContainer}>
            <Ionicons name="restaurant-outline" size={60} color="#CCC" />
            <Text style={styles.noRecipesText}>No recipes found</Text>
            <Text style={styles.noRecipesSubtext}>Try adjusting your search or filters</Text>
          </View>
        }
      />

      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        selectedFilters={selectedFilters}
        setSelectedFilters={setSelectedFilters}
        setFilteredResults={setFilteredResults}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#E8F0FF" },
  scrollContent: { padding: 16, paddingBottom: 24 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#E8F0FF" },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 16, paddingHorizontal: 4 },
  backButton: { padding: 8, marginRight: 8 },
  headerTitle: { flex: 1, fontSize: 24, fontWeight: "700", color: "#333", includeFontPadding: false },
  headerSpacer: { width: 42 },
  topRow: { flexDirection: "row", marginBottom: 16, alignItems: "center", gap: 10 },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "android" ? 4 : 10,
    ...Platform.select({
      android: { elevation: 2 },
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
    }),
  },
  searchInput: { flex: 1, fontSize: 15, color: "#333", paddingVertical: 8, paddingLeft: 8, includeFontPadding: false },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
    ...Platform.select({
      android: { elevation: 2 },
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
    }),
  },
  filterText: { fontSize: 14, fontWeight: "600", color: "#333" },
  columnWrapper: { justifyContent: "space-between", gap: 12 },
  card: {
    width: "48%",
    marginBottom: 16,
    backgroundColor: "#E8F0FF",
    borderRadius: 14,
    overflow: "hidden",
    ...Platform.select({
      android: { elevation: 3 },
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    }),
  },
  image: { width: "100%", height: 120 },
  placeholderImage: { width: "100%", height: 120, backgroundColor: "#f5f5f5", justifyContent: "center", alignItems: "center" },
  placeholderText: { fontSize: 40 },
  cardContent: { padding: 12 },
  cardTitle: { fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 8, minHeight: 36, includeFontPadding: false },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12, color: "#666", fontWeight: "500" },
  assignBtn: { marginTop: 6, backgroundColor: "#007AFF", borderRadius: 10, paddingVertical: 8, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 },
  assignBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  noRecipesContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 60 },
  noRecipesText: { fontSize: 18, fontWeight: "600", color: "#333", marginTop: 16, marginBottom: 8 },
  noRecipesSubtext: { fontSize: 14, color: "#999", textAlign: "center" },
});


