import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import API from "../../api/backend";
import { auth } from "../../firebaseConfig";

export default function EditMeal() {
  const navigation = useNavigation();
  const route = useRoute();
  
  // Get food data passed from MealLog
  const { food, meal: initialMeal, selectedDate } = route.params || {};
  const uid = auth.currentUser?.uid;

  // Base nutritional values (per serving)
  const baseProtein = food?.protein || 0;
  const baseFat = food?.fats || 0;
  const baseCarbs = food?.carbs || 0;
  const baseCalories = food?.calories || 0;

  const [foodName] = useState(food?.name || "Unknown Food");
  const [servingSize] = useState(food?.servingSize || "1 serving");
  const [numServings, setNumServings] = useState("1");
  const [meal, setMeal] = useState(initialMeal || "Breakfast");
  const [showDropdown, setShowDropdown] = useState(false);
  const [message, setMessage] = useState(null);

  // Calculated nutritional values
  const [protein, setProtein] = useState(baseProtein);
  const [fat, setFat] = useState(baseFat);
  const [carbs, setCarbs] = useState(baseCarbs);
  const [calories, setCalories] = useState(baseCalories);

  const mealOptions = ["Breakfast", "Lunch", "Dinner", "Snacks"];

  // 🔹 Auto-calculate nutrition based on servings
  useEffect(() => {
    const servings = parseFloat(numServings) || 1;
    setProtein(Math.round((baseProtein * servings) * 10) / 10);
    setFat(Math.round((baseFat * servings) * 10) / 10);
    setCarbs(Math.round((baseCarbs * servings) * 10) / 10);
    setCalories(Math.round(baseCalories * servings));
  }, [numServings, baseProtein, baseFat, baseCarbs, baseCalories]);

  // Auto-hide message after 3 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // 🔹 Log meal to Firestore
  const logMeal = async () => {
    try {
      if (!uid) {
        setMessage({ text: "You must be logged in to log meals", type: "error" });
        return;
      }

      const servings = parseFloat(numServings) || 1;

      const mealData = {
        mealType: meal,
        date: selectedDate || new Date().toISOString().split("T")[0],
        food: foodName,
        servingSize,
        servings,
        calories,
        protein,
        carbs,
        fats: fat,
      };

      const res = await API.post(`/meals_log/${uid}`, mealData);

      if (res.data.success) {
        setMessage({ text: `${foodName} logged successfully`, type: "success" });
        setTimeout(() => {
        }, 1500);
      } else {
        setMessage({ text: "Could not log meal. Please try again.", type: "error" });
      }
    } catch (err) {
      console.error("Error logging meal:", err);
      setMessage({ text: "Could not log meal. Please try again.", type: "error" });
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* 🔙 Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={26} color="#333" />
        </TouchableOpacity>

        {/* Message Box */}
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

        {/* 🍞 Food Title */}
        <Text style={styles.foodTitle}>{foodName}</Text>
        <Text style={styles.servingInfo}>Per serving: {servingSize}</Text>

        <View style={{ flex: 1 }}>
          {/* Number of Servings */}
          <View style={styles.servingsCard}>
            <View style={styles.servingsHeader}>
              <Ionicons name="restaurant" size={22} color="#4A90E2" />
              <Text style={styles.servingsTitle}>Servings</Text>
            </View>
            
            <View style={styles.servingsControl}>
              <TouchableOpacity
                style={styles.servingBtn}
                onPress={() => {
                  const current = parseFloat(numServings) || 1;
                  if (current > 0.25) {
                    setNumServings((current - 0.25).toString());
                  }
                }}
              >
                <Ionicons name="remove" size={22} color="#4A90E2" />
              </TouchableOpacity>

              <View style={styles.servingInputBox}>
                <TextInput
                  style={styles.servingInput}
                  value={numServings}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  onChangeText={setNumServings}
                />
              </View>

              <TouchableOpacity
                style={styles.servingBtn}
                onPress={() => {
                  const current = parseFloat(numServings) || 1;
                  setNumServings((current + 0.25).toString());
                }}
              >
                <Ionicons name="add" size={22} color="#4A90E2" />
              </TouchableOpacity>
            </View>

            <View style={styles.quickServings}>
              {["0.25", "0.5", "1", "1.5", "2"].map((val) => (
                <TouchableOpacity
                  key={val}
                  style={[
                    styles.quickBtn,
                    numServings === val && styles.quickBtnActive,
                  ]}
                  onPress={() => setNumServings(val)}
                >
                  <Text
                    style={[
                      styles.quickBtnText,
                      numServings === val && styles.quickBtnTextActive,
                    ]}
                  >
                    {val}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Meal Dropdown */}
          <View style={styles.mealCard}>
            <View style={styles.mealHeader}>
              <Ionicons name="time" size={18} color="#4A90E2" />
              <Text style={styles.mealLabel}>Meal Time</Text>
            </View>

            <TouchableOpacity
              style={styles.mealSelector}
              onPress={() => setShowDropdown(!showDropdown)}
            >
              <Text style={styles.mealText}>{meal}</Text>
              <Ionicons
                name={showDropdown ? "chevron-up" : "chevron-down"}
                size={18}
                color="#666"
              />
            </TouchableOpacity>

            {showDropdown && (
              <View style={styles.dropdownOverlay}>
                {mealOptions.map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setMeal(m);
                      setShowDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Nutritional Facts - Read Only */}
          <View style={styles.nutritionCard}>
            <View style={styles.nutritionHeader}>
              <Ionicons name="fitness" size={22} color="#4A90E2" />
              <Text style={styles.nutritionTitle}>Nutritional Facts</Text>
            </View>
            
            <Text style={styles.nutritionSubtitle}>
              Based on {numServings} serving{parseFloat(numServings) !== 1 ? "s" : ""}
            </Text>

            {/* Calories - Large Display */}
            <View style={styles.caloriesBox}>
              <Text style={styles.caloriesValue}>{calories}</Text>
              <Text style={styles.caloriesLabel}>Calories</Text>
            </View>

            {/* Macros Grid */}
            <View style={styles.macrosGrid}>
              <View style={styles.macroItem}>
                <View style={[styles.macroIcon, { backgroundColor: "#FFE5E5" }]}>
                  <Ionicons name="flame" size={18} color="#FF6B6B" />
                </View>
                <Text style={styles.macroValue}>{protein}g</Text>
                <Text style={styles.macroLabel}>Protein</Text>
              </View>

              <View style={styles.macroItem}>
                <View style={[styles.macroIcon, { backgroundColor: "#FFF4E5" }]}>
                  <Ionicons name="water" size={18} color="#FFA726" />
                </View>
                <Text style={styles.macroValue}>{fat}g</Text>
                <Text style={styles.macroLabel}>Fat</Text>
              </View>

              <View style={styles.macroItem}>
                <View style={[styles.macroIcon, { backgroundColor: "#E8F5FF" }]}>
                  <Ionicons name="leaf" size={18} color="#4A90E2" />
                </View>
                <Text style={styles.macroValue}>{carbs}g</Text>
                <Text style={styles.macroLabel}>Carbs</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Log Button */}
        <TouchableOpacity style={styles.logButton} onPress={logMeal}>
          <Ionicons name="checkmark-circle" size={22} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.logText}>Log Food</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
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
  backButton: {
    position: "absolute",
    top: 20,
    left: 10,
    padding: 6,
    zIndex: 50,
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
  foodTitle: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 20,
    marginBottom: 4,
    color: "#333",
  },
  servingInfo: {
    fontSize: 16,
    textAlign: "center",
    color: "#666",
    marginBottom: 16,
    fontWeight: "500",
  },

  // Servings Card
  servingsCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  servingsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  servingsTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
    color: "#333",
  },
  servingsControl: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  servingBtn: {
    backgroundColor: "#E8F0FF",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  servingInputBox: {
    backgroundColor: "#F7F9FF",
    borderWidth: 2,
    borderColor: "#4A90E2",
    borderRadius: 10,
    marginHorizontal: 16,
    minWidth: 70,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  servingInput: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    textAlign: "center",
    padding: 0,
  },
  quickServings: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  quickBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F5F5F5",
    marginHorizontal: 2,
    alignItems: "center",
  },
  quickBtnActive: {
    backgroundColor: "#4A90E2",
  },
  quickBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },
  quickBtnTextActive: {
    color: "#fff",
  },

  // Meal Card
  mealCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  mealHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  mealLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
    color: "#333",
  },
  mealSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F7F9FF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 10,
    padding: 12,
  },
  mealText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  dropdownOverlay: {
    position: "absolute",
    top: 75,
    left: 16,
    right: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    zIndex: 100,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  dropdownItemText: {
    fontSize: 14,
    color: "#333",
  },

  // Nutrition Card
  nutritionCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  nutritionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  nutritionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
    color: "#333",
  },
  nutritionSubtitle: {
    fontSize: 11,
    color: "#666",
    marginBottom: 14,
    marginLeft: 32,
  },
  caloriesBox: {
    backgroundColor: "#F0F7FF",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    marginBottom: 14,
  },
  caloriesValue: {
    fontSize: 40,
    fontWeight: "700",
    color: "#4A90E2",
  },
  caloriesLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginTop: 2,
  },
  macrosGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  macroItem: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 3,
  },
  macroIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  macroValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 2,
  },
  macroLabel: {
    fontSize: 11,
    color: "#666",
    fontWeight: "500",
  },

  // Log Button
  logButton: {
    flexDirection: "row",
    backgroundColor: "#4A90E2",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 8,
    elevation: 3,
  },
  logText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});