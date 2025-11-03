import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Keyboard,
  Alert,
  ActivityIndicator,
  Animated,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { searchFoods, fetchNutrition } from "../../api/nutritionix";
import CustomFoodModal from "./CustomFoodModal";

// 🔹 API backend
import API from "../../api/backend";
import { auth } from "../../firebaseConfig";

// 🔹 Default foods
const defaultFoods = [
  { name: "Toast", calories: 100, protein: 3, carbs: 19, fats: 1, servingSize: "1 slice", servings: 1, info: "Default Food", id: "default_toast" },
  { name: "Boiled Egg", calories: 78, protein: 6, carbs: 1, fats: 5, servingSize: "1 egg", servings: 1, info: "Default Food", id: "default_egg" },
  { name: "Rice (Cooked)", calories: 206, protein: 4, carbs: 45, fats: 0, servingSize: "1 cup", servings: 1, info: "Default Food", id: "default_rice" },
  { name: "Apple", calories: 95, protein: 0, carbs: 25, fats: 0, servingSize: "1 medium", servings: 1, info: "Default Food", id: "default_apple" },
  { name: "Peanut Butter", calories: 188, protein: 8, carbs: 6, fats: 16, servingSize: "2 tbsp", servings: 1, info: "Default Food", id: "default_peanutbutter" },
  { name: "Banana", calories: 105, protein: 1, carbs: 27, fats: 0, servingSize: "1 medium", servings: 1, info: "Default Food", id: "default_banana" },
  { name: "Chicken Breast", calories: 165, protein: 31, carbs: 0, fats: 3.6, servingSize: "100g", servings: 1, info: "Default Food", id: "default_chicken" },
  { name: "Oatmeal", calories: 158, protein: 6, carbs: 27, fats: 3, servingSize: "1 cup cooked", servings: 1, info: "Default Food", id: "default_oatmeal" },
  { name: "Greek Yogurt", calories: 100, protein: 10, carbs: 6, fats: 0, servingSize: "100g", servings: 1, info: "Default Food", id: "default_yogurt" },
  { name: "Almonds", calories: 164, protein: 6, carbs: 6, fats: 14, servingSize: "28g (1 oz)", servings: 1, info: "Default Food", id: "default_almonds" },
  { name: "Carrots", calories: 25, protein: 0.5, carbs: 6, fats: 0, servingSize: "1 medium", servings: 1, info: "Default Food", id: "default_carrots" },
  { name: "Broccoli", calories: 55, protein: 4, carbs: 11, fats: 0.5, servingSize: "1 cup chopped", servings: 1, info: "Default Food", id: "default_broccoli" },
  { name: "Salmon", calories: 208, protein: 20, carbs: 0, fats: 13, servingSize: "100g", servings: 1, info: "Default Food", id: "default_salmon" },
  { name: "Avocado", calories: 240, protein: 3, carbs: 12, fats: 22, servingSize: "1 medium", servings: 1, info: "Default Food", id: "default_avocado" },
  { name: "Cheese (Cheddar)", calories: 113, protein: 7, carbs: 0.5, fats: 9, servingSize: "28g (1 slice)", servings: 1, info: "Default Food", id: "default_cheese" },
];

export default function MealLog() {
  const [activeTab, setActiveTab] = useState("Search");
  const [query, setQuery] = useState("");
  const [meal, setMeal] = useState("Breakfast");
  const [showDropdown, setShowDropdown] = useState(false);
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(false);

  const navigation = useNavigation();
  const route = useRoute();

  // 🔹 Custom foods modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState("list");
  const [myFoods, setMyFoods] = useState([]);
  const [selectedFood, setSelectedFood] = useState(null);
  const [message, setMessage] = useState(null);

  // ✅ SINGLE SOURCE OF TRUTH: All nutrition data stored here
  const [nutritionCache, setNutritionCache] = useState({});

  // image picker state
  const [selectedImage, setSelectedImage] = useState(null);

  // ✅ Get meal type and selectedDate from navigation
  useEffect(() => {
    if (route.params?.mealType) {
      const cap = route.params.mealType.charAt(0).toUpperCase() + route.params.mealType.slice(1);
      setMeal(cap);
    }
  }, [route.params]);

  // ✅ Load default foods on mount
  useEffect(() => {
    setFoods(defaultFoods);
  }, []);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const openGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });
      if (!result.canceled) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (err) {
      console.warn("ImagePicker error:", err);
    }
  };

  const mealOptions = [
    { label: "Breakfast", emoji: "🍳" },
    { label: "Lunch", emoji: "🍽️" },
    { label: "Dinner", emoji: "🌙" },
    { label: "Snacks", emoji: "🍕" },
  ];
  const currentMeal = mealOptions.find((m) => m.label === meal);

  // ✅ OPTIMIZED: Only 1 API call per search, store full nutrition immediately
  const searchFood = async (text) => {
    setQuery(text);
    if (text.length > 1) {
      try {
        setLoading(true);

        const { generic = [], branded = [] } = await searchFoods(text);
        let initialResults = [...generic.slice(0, 8), ...branded.slice(0, 12)];

        // 🔹 Fetch and cache nutrition data for all results
        const searchTimestamp = Date.now(); // Single timestamp for this search
        const refinedResults = await Promise.all(
          initialResults.map(async (f, i) => {
            // ✅ ALWAYS use unique ID - API IDs can be duplicates!
            const id = `${searchTimestamp}_${i}_${Math.random().toString(36).substr(2, 9)}`;

            if (nutritionCache[id]) {
              return nutritionCache[id];
            }

            try {
              const details = await fetchNutrition(f.food_name);
              if (details?.length > 0) {
                const d = details[0];
                const servingQty = d.serving_qty || 1;

                const refined = {
                  id,
                  name: f.food_name,
                  info: f.brand_name || "Generic Food",
                  calories: Math.round((d.nf_calories || 0) / servingQty),
                  protein: Math.round(((d.nf_protein || 0) / servingQty) * 10) / 10,
                  carbs: Math.round(((d.nf_total_carbohydrate || 0) / servingQty) * 10) / 10,
                  fats: Math.round(((d.nf_total_fat || 0) / servingQty) * 10) / 10,
                  servingSize: d.serving_unit
                    ? `${d.serving_qty} ${d.serving_unit}`
                    : f.serving_unit
                      ? `${f.serving_qty} ${f.serving_unit}`
                      : "1 serving",
                  servings: 1,
                };

                setNutritionCache((prev) => ({ ...prev, [id]: refined }));
                return refined;
              }
            } catch (err) {
              console.log("⚠️ Error fetching nutrition for:", f.food_name, err);
            }

            const fallback = {
              id,
              name: f.food_name,
              info: f.brand_name || "Generic Food",
              calories: Math.round(f.nf_calories || 0),
              protein: Math.round((f.nf_protein || 0) * 10) / 10,
              carbs: Math.round((f.nf_total_carbohydrate || 0) * 10) / 10,
              fats: Math.round((f.nf_total_fat || 0) * 10) / 10,
              servingSize: f.serving_unit
                ? `${f.serving_qty} ${f.serving_unit}`
                : "1 serving",
              servings: 1,
            };

            setNutritionCache((prev) => ({ ...prev, [id]: fallback }));
            return fallback;
          })
        );

        setFoods(refinedResults);
      } catch (err) {
        console.error("❌ Error searching food:", err);
        Alert.alert("Search Error", "Could not fetch food data. Please try again.");
      } finally {
        setLoading(false);
      }
    } else {
      setFoods(defaultFoods);
    }
  };

  // ✅ Save meal - food already has full nutrition from cache
  const saveMeal = async (food) => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        Alert.alert("Not logged in", "You must be logged in to save meals.");
        return;
      }

      const mealLog = {
        mealType: meal,
        date: route.params?.selectedDate || new Date().toISOString().split("T")[0],
        food: food.name,
        calories: food.calories || 0,
        protein: food.protein || 0,
        carbs: food.carbs || 0,
        fats: food.fats || 0,
        servingSize: food.servingSize || "1 serving",
        servings: 1,
      };

      const postRes = await API.post(`/meals_log/${uid}`, mealLog);

      if (postRes.data?.success) {
        setMessage({ text: `${food.name} added to ${meal}`, type: "success" });
      } else {
        setMessage({ text: "❌ Failed to log meal. Please try again.", type: "error" });
      }
    } catch (err) {
      console.error("❌ Error saving meal:", err);
      Alert.alert("Error", "Could not save meal.");
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#333" />
        </TouchableOpacity>

        {message && (
          <View
            style={[
              styles.messageBox,
              message.type === "success" ? styles.successBox : styles.errorBox,
            ]}
          >
            <Text style={styles.messageText}>{message.text}</Text>
          </View>
        )}

        {/* Meal Selector */}
        <View style={styles.mealBox}>
          <TouchableOpacity
            style={styles.mealButton}
            onPress={() => {
              setShowDropdown((p) => !p);
              Keyboard.dismiss();
            }}
          >
            <Text style={styles.mealText}>
              {currentMeal ? currentMeal.emoji : "🍽️"} {meal}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#333" style={styles.iconWrapper} />
          </TouchableOpacity>

          {showDropdown && (
            <View style={styles.dropdown}>
              {mealOptions.map((m) => (
                <TouchableOpacity
                  key={m.label}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setMeal(m.label);
                    setShowDropdown(false);
                  }}
                >
                  <Text style={styles.dropdownText}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Tabs */}
        <View style={styles.headerTabs}>
          {["Search", "Photo", "Barcode"].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Ionicons
                name={tab === "Search" ? "search" : tab === "Photo" ? "camera" : "barcode-outline"}
                size={20}
                color={activeTab === tab ? "#fff" : "#4A90E2"}
              />
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Search Tab */}
        {activeTab === "Search" && (
          <View style={{ flex: 1 }}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={20} color="#666" style={{ marginRight: 6 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search to add food"
                placeholderTextColor="#999"
                value={query}
                onChangeText={searchFood}
              />
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4A90E2" />
                <Text style={styles.loadingText}>Searching foods...</Text>
              </View>
            ) : (
              <ScrollView contentContainerStyle={{ paddingBottom: 30 }} keyboardShouldPersistTaps="always">
                {foods.map((f) => (
                  <View key={f.id} style={styles.foodRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.foodName}>{f.name}</Text>
                      <Text style={styles.foodInfo}>
                        {f.calories} kcal
                      </Text>
                      <Text style={styles.servingText}>{f.servingSize}</Text>
                    </View>
                    <View style={styles.actions}>
                      <TouchableOpacity style={styles.plusBtn} onPress={() => saveMeal(f)}>
                        <Ionicons name="add-circle-outline" size={22} color="#4A90E2" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.editBtn}
                        onPress={() => {
                          navigation.navigate("EditMeal", {
                            food: f,
                            meal,
                            selectedDate: route.params?.selectedDate || new Date().toISOString().split("T")[0],
                          });
                        }}
                      >
                        <Ionicons name="create-outline" size={22} color="#FF9800" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* Photo Tab */}
        {activeTab === "Photo" && (
          <View style={styles.centeredBox}>
            <Text style={styles.title}>Snap your food for facts</Text>
            <View style={styles.imageBox}>
              {selectedImage ? (
                <Image source={{ uri: selectedImage }} style={styles.previewImage} />
              ) : (
                <Text style={styles.noImageText}>No Image Selected</Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate("FoodRecognition")}
            >
              <Text style={styles.actionText}>📷 Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={openGallery}>
              <Text style={styles.actionText}>🖼️ Gallery</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Barcode Tab */}
        {activeTab === "Barcode" && (
          <View style={styles.centeredBox}>
            <Text style={styles.title}>Scan your Barcode</Text>

            <View style={styles.barcodeBox}>
              <Text style={styles.barcodeText}>[ ||||||||||||||| ]</Text>
            </View>

            {/* Scan Button */}
            <TouchableOpacity
              style={styles.barcodeActionButton}
              onPress={() => navigation.navigate("QRScanner")}
            >
              <Ionicons name="scan-outline" size={22} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.scanText}>Scan</Text>
            </TouchableOpacity>
          </View>
        )}


      </View>

      {/* CustomFoodModal */}
      <CustomFoodModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setSelectedFood(null);
          setModalType("list");
        }}
        modalType={modalType}
        setModalType={setModalType}
        myFoods={myFoods}
        setMyFoods={setMyFoods}
        selectedFood={selectedFood}
        setSelectedFood={setSelectedFood}
        uid={auth.currentUser?.uid}
        selectedDate={route.params?.selectedDate || new Date().toISOString().split("T")[0]}
        onEditFood={(food) => {
          setSelectedFood(food);
          setModalType("edit");
          setModalVisible(true);
        }}
      />

      {/* Floating Action Button */}
      <ExpandableFAB
        onMyFoodPress={() => {
          setModalType("list");
          setModalVisible(true);
        }}
        onAddFoodPress={() => {
          setModalType("add");
          setModalVisible(true);
        }}
      />
    </SafeAreaView>
  );
}

// 🔹 Expandable FAB
function ExpandableFAB({ onMyFoodPress, onAddFoodPress }) {
  const [open, setOpen] = useState(false);
  const slideAnim = useState(new Animated.Value(0))[0];
  const opacityAnim = useState(new Animated.Value(0))[0];

  const toggleMenu = () => {
    if (open) {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => setOpen(false));
    } else {
      setOpen(true);
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  };

  return (
    <View style={styles.fabContainer}>
      {open && (
        <Animated.View
          style={[
            styles.options,
            {
              opacity: opacityAnim,
              transform: [{ translateY: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.optionBtn}
            onPress={() => {
              onMyFoodPress();
              toggleMenu();
            }}
          >
            <Ionicons name="fast-food-outline" size={22} color="#4A90E2" />
            <Text style={styles.optionText}>My Food</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionBtn}
            onPress={() => {
              onAddFoodPress();
              toggleMenu();
            }}
          >
            <Ionicons name="add-circle-outline" size={22} color="#4A90E2" />
            <Text style={styles.optionText}>Add Food</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      <TouchableOpacity style={styles.fab} onPress={toggleMenu}>
        <Ionicons name={open ? "close" : "add"} size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#E8F0FF" },
  container: {
    flex: 1,
    backgroundColor: "#E8F0FF",
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  backButton: { position: "absolute", top: 20, left: 10, zIndex: 50, padding: 8 },
  mealBox: { alignItems: "center", marginBottom: 20, zIndex: 20 },
  mealButton: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 12,
    minWidth: 190,
    paddingLeft: 20,
    paddingRight: 46,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    zIndex: 21,
  },
  mealText: { fontSize: 16, fontWeight: "600", color: "#333" },
  iconWrapper: { position: "absolute", right: 14 },
  dropdown: {
    position: "absolute",
    top: 52,
    width: 200,
    backgroundColor: "#fff",
    borderRadius: 10,
    elevation: 6,
    zIndex: 30,
    paddingVertical: 4,
  },
  dropdownItem: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, paddingHorizontal: 14 },
  dropdownText: { fontSize: 15, color: "#333" },
  headerTabs: { flexDirection: "row", justifyContent: "space-around", marginBottom: 20, marginTop: 6 },
  tabButton: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, backgroundColor: "#fff" },
  tabButtonActive: { backgroundColor: "#4A90E2" },
  tabText: { marginLeft: 6, fontWeight: "600", color: "#4A90E2" },
  tabTextActive: { color: "#fff" },
  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 14 },
  searchInput: { flex: 1, fontSize: 16, color: "#333" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
  },
  foodRow: { flexDirection: "row", justifyContent: "space-between", backgroundColor: "#fff", padding: 16, borderRadius: 12, marginBottom: 14, elevation: 2 },
  foodName: { fontWeight: "600", fontSize: 16, color: "#333" },
  foodInfo: { fontSize: 13, color: "#666", marginTop: 3 },
  servingText: { fontSize: 12, color: "#999", marginTop: 2 },
  actions: { flexDirection: "row", alignItems: "center" },
  plusBtn: { marginRight: 14 },
  editBtn: { marginRight: 0 },
  centeredBox: { flex: 1, alignItems: "center", justifyContent: "center", marginTop: 20, paddingHorizontal: 20 },
  title: { fontSize: 20, fontWeight: "600", marginBottom: 22 },
  actionButton: { backgroundColor: "#fff", paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, marginTop: 14, elevation: 2, width: 200, alignItems: "center" },
  actionText: { fontSize: 16, fontWeight: "500" },
  barcodeBox: {
    width: 280,
    height: 160,
    borderWidth: 2,
    borderColor: "#333",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 36,
    backgroundColor: "#fff",
  },
  barcodeText: { fontSize: 28, letterSpacing: 4 },
  barcodeActionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4A90E2",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    marginTop: 12,
    width: 240,
    justifyContent: "center",
  },
  scanText: { color: "#fff", fontSize: 18, fontWeight: "600" },
  fabContainer: {
    position: "absolute",
    bottom: 30,
    right: 20,
    alignItems: "flex-end",
  },
  fab: {
    backgroundColor: "#4A90E2",
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
  },
  options: {
    marginBottom: 10,
    alignItems: "flex-end",
  },
  optionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eaf6fcff",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginBottom: 10,
    elevation: 3,
    width: 120,
    justifyContent: "flex-start",
  },
  optionText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  messageBox: {
    position: "absolute",
    top: 10,
    left: 20,
    right: 20,
    zIndex: 100,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    elevation: 4,
  },
  successBox: { backgroundColor: "#DFF2BF" },
  errorBox: { backgroundColor: "#FFD2D2" },
  messageText: { fontSize: 14, fontWeight: "600", color: "#333" },
  imageBox: {
    width: 240,
    height: 180,
    backgroundColor: "#fff",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    elevation: 3,
    overflow: "hidden",
  },
  previewImage: { width: "100%", height: "100%", resizeMode: "cover" },
  noImageText: { color: "#666", fontSize: 15 },
});