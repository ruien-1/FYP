import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth } from "../../firebaseConfig";
import API from "../../api/backend";
import LogMealModal from "./LogMealModal";

export default function ViewMoreRecipes() {
  const navigation = useNavigation();
  const route = useRoute();
  const { allRecipes = [], category, fromFilter = false, sectionName } = route.params || {};

  const [recipes, setRecipes] = useState(allRecipes || []);
  const [favorites, setFavorites] = useState({});
  const [search, setSearch] = useState("");

  const [logModalVisible, setLogModalVisible] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");


  // Fetch favorites from firestore
  const fetchFavorites = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const res = await API.get(`/favorites/${user.uid}`);
      const favsObj = {};
      res.data.forEach((r) => {
        favsObj[r.id] = r;
      });
      setFavorites(favsObj);
    } catch (error) {
      console.error("Error fetching favorites:", error.message);
    }
  };

      useEffect(() => {
      fetchFavorites();
    }, []);


  // Add or remove favorites from user's favorites
  const handleToggleFavorite = async (recipe) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not logged in");

      const exists = !!favorites[recipe.id];
      if (exists) {
        await API.delete(`/favorites/${user.uid}/${recipe.id}`);
      } else {
        await API.post(`/favorites/${user.uid}`, recipe);
      }
      await fetchFavorites(); 
    } catch (error) {
      console.error("Error toggling favorite:", error.message);
    }
  };

  // Add recipe to meals_log
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
        setSuccessMessage(`"${fullRecipe.title}" logged successfully!`);
        setTimeout(() => setSuccessMessage(""), 3000);
      }
    } catch (err) {
      console.error("Error logging meal:", err);
      setSuccessMessage("Failed to log meal. Please try again.");
      setTimeout(() => setSuccessMessage(""), 3000);
    }
  };


    // for searching
    const filteredRecipes = recipes.filter((r) =>
      r.title.toLowerCase().includes(search.toLowerCase())
    );

    // checks if recipes is already a favorite
    const renderRecipeCard = (item) => {
      const isFavorited = !!favorites[item.id];

    return (
      <View key={item.id} style={styles.card}>
        <TouchableOpacity
          onPress={() => navigation.navigate("RecipeDetail", { id: item.id })}
        >
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.image} />
          ) : (
            <View style={styles.placeholderImage}>
              <Text style={styles.placeholderText}>🍽️</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* ⭐ + 🍽️ Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleToggleFavorite(item)}
          >
            <Ionicons
              name={isFavorited ? "star" : "star-outline"}
              size={18}
              color={isFavorited ? "#FFD700" : "#333"}
            />
            <Text style={styles.actionText}>
              {isFavorited ? "Favorited" : "Favorite"}
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

        {/* Recipe info */}
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={styles.cardDetails}>
            <Text style={styles.detailText}>{item.calories || 0} kcal</Text>
            <Text style={styles.detailText}>{item.readyInMinutes || 0} min</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {fromFilter && sectionName
            ? `${sectionName} Recipes`
            : fromFilter
            ? "Filtered Recipes"
            : category?.label || "Recipes"}
        </Text>
      </View>

        {/* Success message */}
          {successMessage ? (
            <View style={styles.successMessageBox}>
              <Text style={styles.successMessageText}>{successMessage}</Text>
            </View>
          ) : null}

        {/* Search Bar */}
        <View style={styles.searchBarWrapper}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#555" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search recipes..."
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>

        {/* Recipe List */}
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {filteredRecipes.length > 0 ? (
            filteredRecipes.map(renderRecipeCard)
          ) : (
            <View style={styles.center}>
              <Text>No recipes found.</Text>
              <Text style={{ fontSize: 12, color: "#999", marginTop: 10 }}>
              </Text>
            </View>
          )}
        </ScrollView>

      <LogMealModal
        visible={logModalVisible}
        onClose={() => setLogModalVisible(false)}
        recipe={selectedRecipe}
        onLog={(recipe, mealType, servings) => LogToDiary(recipe, mealType, servings)}
     />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#E8F0FF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    backgroundColor: "#E8F0FF",
  },
  backButton: { padding: 4, marginRight: 8 },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    flex: 1,
    textAlign: "center",
    marginRight: 32,
  },
  searchBarWrapper: { paddingHorizontal: 16, marginBottom: 16 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  searchInput: {
    flex: 1,
    marginHorizontal: 8,
    fontSize: 16,
    paddingVertical: 4,
  },
  content: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 20 },
  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  image: {
    width: "100%",
    height: 160,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  placeholderImage: {
    width: "100%",
    height: 160,
    backgroundColor: "#f0f0f0",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: { fontSize: 28 },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 8,
    backgroundColor: "#f9f9f9",
    borderTopWidth: 1,
    borderColor: "#eee",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#fff",
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
  },
  actionText: {
    fontSize: 13,
    marginLeft: 6,
    color: "#333",
  },
  cardContent: { padding: 12 },
  cardTitle: { fontSize: 15, fontWeight: "600", marginBottom: 6 },
  cardDetails: { flexDirection: "row", justifyContent: "space-between" },
  detailText: { fontSize: 13, color: "#666" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  successMessageBox: {
  position: "absolute",
  top: 20,
  left: 20,
  right: 20,
  padding: 12,
  backgroundColor: "#d4edda",
  borderRadius: 8,
  zIndex: 99,
},
successMessageText: {
  color: "#155724",
  fontWeight: "bold",
  textAlign: "center",
},

});
