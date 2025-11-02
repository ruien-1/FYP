// screens/FavRecipes.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth } from "../../firebaseConfig";
import API from "../../api/backend";
import LogMealModal from "./LogMealModal";

export default function FavRecipes() {
  const navigation = useNavigation();
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState([]);
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  // fetch favorites from firestore
  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        const res = await API.get(`/favorites/${user.uid}`);
        setFavorites(res.data);
      } catch (error) {
        console.error("Error fetching favorites:", error);
      }
    };

    fetchFavorites();
  }, []);

  // add or remove from user's favorite
  const handleToggleFavorite = async (recipe) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const exists = favorites.some((f) => f.id === recipe.id);

      if (exists) {
        await API.delete(`/favorites/${user.uid}/${recipe.id}`);
        setFavorites(favorites.filter((f) => f.id !== recipe.id));
      } else {
        await API.post(`/favorites/${user.uid}`, recipe);
        setFavorites([...favorites, recipe]);
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
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
        console.log("✅ Meal logged:", postRes.data.meal);
        setSuccessMessage(`"${fullRecipe.title}" logged successfully!`);
        setTimeout(() => setSuccessMessage(""), 3000);
      }
    } catch (err) {
      console.error("Error logging meal:", err);
      setSuccessMessage("Failed to log meal. Please try again.");
      setTimeout(() => setSuccessMessage(""), 3000);
    }
  };

  const filtered = favorites.filter((item) =>
    item.title.toLowerCase().includes(search.toLowerCase())
  );

  const renderCard = ({ item }) => (
    <View style={styles.card}>
      <TouchableOpacity
        onPress={() => navigation.navigate("RecipeDetail", { id: item.id })}
      >
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.cardImage} />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="restaurant-outline" size={32} color="#888" />
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleToggleFavorite(item)}
        >
          <Ionicons
            name={favorites.some((f) => f.id === item.id) ? "star" : "star-outline"}
            size={18}
            color={favorites.some((f) => f.id === item.id) ? "#FFD700" : "#333"}
          />
          <Text style={styles.actionText}>
            {favorites.some((f) => f.id === item.id) ? "Favorited" : "Favorite"}
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

      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.cardFooter}>
          <Text style={styles.cardSubtitle}>{item.calories || 0} kcal</Text>
          <Text style={styles.cardSubtitle}>{item.time || 0} min</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeContainer}>
      {successMessage ? (
        <View style={styles.toastMessageBox}>
          <Text style={styles.toastMessageText}>{successMessage}</Text>
        </View>
      ) : null}

      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Favorites</Text>
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color="#888" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <FlatList
          data={filtered}
          renderItem={renderCard}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: "space-between" }}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      </View>

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
  safeContainer: { flex: 1, backgroundColor: "#E6F0FA" },
  container: { flex: 1, padding: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    justifyContent: "center",
    position: "relative",
  },
  backButton: { position: "absolute", left: 0 },
  headerTitle: { fontSize: 30, fontWeight: "700", textAlign: "center" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  searchInput: { flex: 1, paddingVertical: 8, paddingHorizontal: 6 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 16,
    flex: 0.48,
    overflow: "hidden",
    elevation: 2,
  },
  cardImage: { width: "100%", height: 120 },
  placeholder: {
    width: "100%",
    height: 120,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#e0e0e0",
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    paddingHorizontal: 6,
    backgroundColor: "#f2f2f2",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: "#fff",
    borderRadius: 16,
    elevation: 1,
  },
  actionText: { fontSize: 12, marginLeft: 4, color: "#333" },
  cardContent: { padding: 10 },
  cardTitle: { fontSize: 14, fontWeight: "600", marginBottom: 6 },
  cardSubtitle: { fontSize: 12, color: "#555" },
  cardFooter: { flexDirection: "row", justifyContent: "space-between" },

  // Toast message styles
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
