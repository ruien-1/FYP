import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  Platform,
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

  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        const res = await API.get(`/favorites/${user.uid}`);
        setFavorites(res.data);
      } catch (error) {
      }
    };

    fetchFavorites();
  }, []);

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
    }
  };

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
        activeOpacity={0.8}
      >
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.cardImage} />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>🍽️</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Card Content */}
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>
        
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
            onPress={() => handleToggleFavorite(item)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={favorites.some((f) => f.id === item.id) ? "star" : "star-outline"}
              size={18}
              color={favorites.some((f) => f.id === item.id) ? "#FFD700" : "#666"}
            />
            <Text
              style={[
                styles.cardActionText,
                favorites.some((f) => f.id === item.id) && styles.cardActionTextActive,
              ]}
            >
              {favorites.some((f) => f.id === item.id) ? "Saved" : "Save"}
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
  );

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top']}>
      {successMessage ? (
        <View style={styles.toastMessageBox}>
          <Text style={styles.toastMessageText}>{successMessage}</Text>
        </View>
      ) : null}

      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={26} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Favorites</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color="#888" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search favorites..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#999"
          />
        </View>

        {/* Recipe List */}
        <FlatList
          data={filtered}
          renderItem={renderCard}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="star-outline" size={60} color="#CCC" />
              <Text style={styles.emptyText}>No favorites yet</Text>
              <Text style={styles.emptySubtext}>
                Start adding your favorite recipes!
              </Text>
            </View>
          }
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
  safeContainer: { 
    flex: 1, 
    backgroundColor: "#E8F0FF",
  },
  container: { 
    flex: 1, 
    paddingHorizontal: 16,
  },
  
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingTop: 8,
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
  
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
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
  
  // List
  listContent: {
    paddingBottom: 24,
  },
  columnWrapper: {
    justifyContent: "space-between",
    gap: 12,
  },
  
  card: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 14,
    marginBottom: 16,
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
  cardImage: { 
    width: "100%", 
    height: 120,
  },
  placeholder: {
    width: "100%",
    height: 120,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  placeholderText: {
    fontSize: 40,
  },
  
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
  
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },

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