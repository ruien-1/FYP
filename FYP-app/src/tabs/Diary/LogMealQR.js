import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { auth } from "../../firebaseConfig";
import API from "../../api/backend";

export default function LogMealQR() {
  const route = useRoute();
  const navigation = useNavigation();
  const { productInfo, logMealData, barcode } = route.params || {};

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);

  // Default values (meal type can be changed by user later)
  const [mealType, setMealType] = useState(logMealData?.mealType || "Lunch");
  
  // State for fetched food data
  const [foodData, setFoodData] = useState(null);
  
  // Get original serving info from fetched data or productInfo
  const originalServingSize = foodData?.servingAmount || productInfo?.servingAmount || 100;
  const originalServingUnit = foodData?.servingUnit || productInfo?.servingUnit || "g";
  
  const [servingSize, setServingSize] = useState("");
  const [servings, setServings] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const [food] = useState(foodData?.productName || productInfo?.name || "Unknown Food");
  const [brand] = useState(foodData?.brand || productInfo?.brand || "");
  
  // Success and error messages
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const showSuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => {
      setSuccessMessage("");
      navigation.goBack();
    }, 4000);
  };

  const showError = (msg) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(""), 3000);
  };
  
  // Update servingSize when foodData or productInfo changes
  useEffect(() => {
    if (originalServingSize) {
      setServingSize(originalServingSize.toString());
    }
  }, [originalServingSize]);

  // Nutrient values from fetched data or productInfo (per original serving size)
  const proteinPerServing = foodData?.protein || productInfo?.nutriments?.proteins_100g || productInfo?.protein || 0;
  const fatPerServing = foodData?.fat || productInfo?.nutriments?.fat_100g || productInfo?.fat || 0;
  const carbsPerServing = foodData?.carbs || productInfo?.nutriments?.carbohydrates_100g || productInfo?.carbs || 0;
  const caloriesPerServing = foodData?.calories || productInfo?.nutriments?.calories || productInfo?.calories || 0;

  // Fetch food data from backend if barcode is provided
  useEffect(() => {
    const fetchFoodData = async () => {
      if (barcode) {
        try {
          setLoading(true);
          const response = await API.get(`/QRFood/barcode/${barcode}`);

          if (response.data.success) {
            setFoodData(response.data);
          } else {
            console.log("ℹ️ Product not found in backend, using fallback data.");
            setFoodData(productInfo || null);
          }
        } catch (error) {
          if (error.response && error.response.status === 404) {
            console.log("ℹ️ Product not found (404) — using fallback data.");
            setFoodData(productInfo || null);
          } else {
            console.error("❌ Unexpected error fetching food data:", error);
            showError("Failed to load food details");
          }
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    fetchFoodData();
  }, [barcode]);

  // Calculate totals based on serving ratio
  const servingRatio = (Number(servingSize) / originalServingSize) * Number(servings);
  
  const totalProtein = (proteinPerServing * servingRatio).toFixed(1);
  const totalFat = (fatPerServing * servingRatio).toFixed(1);
  const totalCarbs = (carbsPerServing * servingRatio).toFixed(1);
  const totalCalories = (caloriesPerServing * servingRatio).toFixed(0);

  useEffect(() => {
    if (route.params?.mealType) {
      const cap = route.params.mealType.charAt(0).toUpperCase() + route.params.mealType.slice(1);
      setMealType(cap);
    }
  }, [route.params]);
    
  const handleSaveMeal = async () => {
    // Validate inputs
    if (!servingSize || Number(servingSize) <= 0) {
      showError("Please enter a valid serving size.");
      return;
    }

    if (!servings || Number(servings) <= 0) {
      showError("Please enter number of servings.");
      return;
    }

    try {
      const userId = auth.currentUser.uid;
      const mealId = Date.now().toString();

      const meal = {
        id: mealId,
        userId,
        mealType,
        date: route.params?.selectedDate || new Date().toISOString().split("T")[0],
        food,
        servingSize: `${servingSize} ${originalServingUnit}`,
        servings: Number(servings),
        calories: Number(totalCalories),
        protein: Number(totalProtein),
        carbs: Number(totalCarbs),
        fats: Number(totalFat),
        source: "barcode",
      };

      await API.post(`/meals_log/${userId}`, meal);

      showSuccess("Meal logged successfully!");
    } catch (error) {
      console.error("❌ Error saving meal:", error);
      showError("Failed to save meal. Try again.");
    }
  };

  // ---------- Screen 1: Analysis Result ----------
  if (step === 1) {
    if (loading) {
      return (
        <View style={styles.container}>
          <View style={styles.card}>
            <Ionicons name="hourglass-outline" size={48} color="#2196f3" />
            <Text style={styles.loadingText}>Loading product details...</Text>
          </View>
        </View>
      );
    }

    return (
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backIcon}>
            <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nutrition Analysis</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Success/Error Messages */}
        {successMessage ? (
          <View style={styles.successBox}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#2E7D32" />
            <Text style={styles.successText}>{successMessage}</Text>
          </View>
        ) : null}
        {errorMessage ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={20} color="#D32F2F" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <View style={styles.productHeader}>
            <Ionicons name="nutrition-outline" size={32} color="#2196f3" />
            <View style={styles.productInfo}>
              <Text style={styles.foodName}>{food}</Text>
            </View>
          </View>

          <View style={styles.servingBox}>
            <Text style={styles.servingBoxText}>
              Per {originalServingSize} {originalServingUnit} serving
            </Text>
          </View>

          <View style={styles.nutritionGrid}>
            <View style={styles.nutrientCard}>
              <View style={styles.nutrientIcon}>
                <Ionicons name="flame" size={24} color="#ff6b6b" />
              </View>
              <Text style={styles.nutrientValue}>{Math.round(caloriesPerServing)}</Text>
              <Text style={styles.nutrientLabel}>Calories</Text>
            </View>

            <View style={styles.nutrientCard}>
              <View style={[styles.nutrientIcon, { backgroundColor: '#e3f2fd' }]}>
                <Ionicons name="fish" size={24} color="#2196f3" />
              </View>
              <Text style={styles.nutrientValue}>{Math.round(proteinPerServing)}g</Text>
              <Text style={styles.nutrientLabel}>Protein</Text>
            </View>

            <View style={styles.nutrientCard}>
              <View style={[styles.nutrientIcon, { backgroundColor: '#fff3e0' }]}>
                <Ionicons name="water" size={24} color="#ff9800" />
              </View>
              <Text style={styles.nutrientValue}>{Math.round(fatPerServing)}g</Text>
              <Text style={styles.nutrientLabel}>Fat</Text>
            </View>

            <View style={styles.nutrientCard}>
              <View style={[styles.nutrientIcon, { backgroundColor: '#f3e5f5' }]}>
                <Ionicons name="leaf" size={24} color="#9c27b0" />
              </View>
              <Text style={styles.nutrientValue}>{Math.round(carbsPerServing)}g</Text>
              <Text style={styles.nutrientLabel}>Carbs</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => setStep(2)}
          >
            <Ionicons name="add-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.primaryButtonText}>Log This Meal</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // ---------- Screen 2: Log Meal ----------
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setStep(1)} style={styles.backIcon}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Log Meal</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Success/Error Messages */}
      {successMessage ? (
        <View style={styles.successBox}>
          <Ionicons name="checkmark-circle-outline" size={20} color="#2E7D32" />
          <Text style={styles.successText}>{successMessage}</Text>
        </View>
      ) : null}
      {errorMessage ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={20} color="#D32F2F" />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Ionicons name="restaurant-outline" size={20} color="#666" />
          <Text style={styles.sectionTitle}>Food Details</Text>
        </View>
        <Text style={styles.foodNameLarge}>{food}</Text>

        {/* Meal Type Selection */}
        <View style={[styles.inputGroup, { marginTop: 24 }]}>
          <Text style={styles.label}>
            <Ionicons name="time-outline" size={16} color="#666" /> Meal Type
          </Text>
          
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowDropdown((prev) => !prev)}
          >
            <Text style={styles.dropdownText}>
              {mealType === "Breakfast"
                ? "🍳 Breakfast"
                : mealType === "Lunch"
                ? "🍽️ Lunch"
                : mealType === "Dinner"
                ? "🌙 Dinner"
                : "🍕 Snack"}
            </Text>
            <Ionicons name={showDropdown ? "chevron-up" : "chevron-down"} size={20} color="#666" />
          </TouchableOpacity>

          {showDropdown && (
            <View style={styles.dropdownMenu}>
              {["Breakfast", "Lunch", "Dinner", "Snack"].map((meal) => (
                <TouchableOpacity
                  key={meal}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setMealType(meal);
                    setShowDropdown(false);
                  }}
                >
                  <Text style={styles.dropdownItemText}>
                    {meal === "Breakfast"
                      ? "🍳 Breakfast"
                      : meal === "Lunch"
                      ? "🍽️ Lunch"
                      : meal === "Dinner"
                      ? "🌙 Dinner"
                      : "🍕 Snack"}
                  </Text>
                  {mealType === meal && (
                    <Ionicons name="checkmark" size={20} color="#2196f3" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.sectionHeader}>
          <Ionicons name="scale-outline" size={20} color="#666" />
          <Text style={styles.sectionTitle}>Serving Information</Text>
        </View>

        {/* Serving Size */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Serving Size ({originalServingUnit})</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={servingSize}
              onChangeText={setServingSize}
              keyboardType="numeric"
              placeholder={originalServingSize.toString()}
              placeholderTextColor="#999"
            />
            <Text style={styles.inputUnit}>{originalServingUnit}</Text>
          </View>
          <Text style={styles.helperText}>
            Original: {originalServingSize} {originalServingUnit}
          </Text>
        </View>

        {/* Number of Servings */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Number of Servings</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={servings}
              onChangeText={setServings}
              keyboardType="numeric"
              placeholder="1"
              placeholderTextColor="#999"
            />
            <Ionicons name="pizza-outline" size={20} color="#666" />
          </View>
        </View>

        {/* Total Nutrition Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Ionicons name="calculator-outline" size={20} color="#2196f3" />
            <Text style={styles.summaryTitle}>Total Nutrition</Text>
          </View>
          
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Ionicons name="flame" size={18} color="#ff6b6b" />
              <Text style={styles.summaryValue}>{totalCalories}</Text>
              <Text style={styles.summaryLabel}>kcal</Text>
            </View>
            
            <View style={styles.summaryItem}>
              <Ionicons name="fish" size={18} color="#2196f3" />
              <Text style={styles.summaryValue}>{totalProtein}g</Text>
              <Text style={styles.summaryLabel}>Protein</Text>
            </View>
            
            <View style={styles.summaryItem}>
              <Ionicons name="water" size={18} color="#ff9800" />
              <Text style={styles.summaryValue}>{totalFat}g</Text>
              <Text style={styles.summaryLabel}>Fat</Text>
            </View>
            
            <View style={styles.summaryItem}>
              <Ionicons name="leaf" size={18} color="#9c27b0" />
              <Text style={styles.summaryValue}>{totalCarbs}g</Text>
              <Text style={styles.summaryLabel}>Carbs</Text>
            </View>
          </View>

          <Text style={styles.summaryNote}>
            For {servingSize || originalServingSize} {originalServingUnit} × {servings || "0"} serving(s)
          </Text>
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={handleSaveMeal}>
          <Ionicons name="checkmark-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.primaryButtonText}>Save Meal</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#E8F0FF",
    paddingTop: 60,
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1a1a1a",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  // Error Box
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFEBEE",
    padding: 14,
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#D32F2F",
  },
  errorText: { 
    color: "#C62828", 
    marginLeft: 10, 
    flex: 1, 
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "500",
  },
  // Success Box
  successBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    padding: 14,
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",
  },
  successText: { 
    color: "#2E7D32", 
    marginLeft: 10, 
    flex: 1, 
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "500",
  },
  productHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  productInfo: {
    marginLeft: 12,
    flex: 1,
  },
  foodName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  foodNameLarge: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 8,
    textAlign: "center",
  },
  brandText: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
    textAlign: "center",
    marginBottom: 20,
  },
  servingInfo: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
  },
  servingBox: {
    backgroundColor: "#f5f5f5",
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  servingBoxText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    fontWeight: "500",
  },
  nutritionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  nutrientCard: {
    width: "48%",
    backgroundColor: "#fafafa",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  nutrientIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#ffebee",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  nutrientValue: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  nutrientLabel: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    marginLeft: 8,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fafafa",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1a1a1a",
  },
  inputUnit: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
  },
  helperText: {
    fontSize: 12,
    color: "#999",
    marginTop: 6,
  },
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fafafa",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dropdownText: {
    fontSize: 16,
    color: "#1a1a1a",
  },
  dropdownMenu: {
    marginTop: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  dropdownItemText: {
    fontSize: 16,
    color: "#1a1a1a",
  },
  summaryCard: {
    backgroundColor: "#e3f2fd",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#bbdefb",
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a1a",
    marginLeft: 8,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  summaryItem: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginVertical: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#666",
  },
  summaryNote: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
    fontStyle: "italic",
  },
  primaryButton: {
    backgroundColor: "#2196f3",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: "#2196f3",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});