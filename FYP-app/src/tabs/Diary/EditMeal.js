import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import API from "../../api/backend";
import { auth } from "../../firebaseConfig";

export default function EditMeal() {
  const navigation = useNavigation();
  const route = useRoute();
  
  const { food, meal: initialMeal, selectedDate } = route.params || {};
  const uid = auth.currentUser?.uid;

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

  const [protein, setProtein] = useState(baseProtein);
  const [fat, setFat] = useState(baseFat);
  const [carbs, setCarbs] = useState(baseCarbs);
  const [calories, setCalories] = useState(baseCalories);

  const mealOptions = ["Breakfast", "Lunch", "Dinner", "Snack"];

  useEffect(() => {
    const servings = parseFloat(numServings) || 1;
    setProtein(Math.round((baseProtein * servings) * 10) / 10);
    setFat(Math.round((baseFat * servings) * 10) / 10);
    setCarbs(Math.round((baseCarbs * servings) * 10) / 10);
    setCalories(Math.round(baseCalories * servings));
  }, [numServings, baseProtein, baseFat, baseCarbs, baseCalories]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

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
        // Navigate back after successful log
        setTimeout(() => {
          navigation.goBack();
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
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header with Back Button */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={26} color="#333" />
          </TouchableOpacity>
          <View style={styles.headerSpacer} />
        </View>

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

        <View style={styles.titleContainer}>
          <Text style={styles.foodTitle}>{foodName}</Text>
          <Text style={styles.servingInfo}>Per serving: {servingSize}</Text>
        </View>

        {/* SCROLLABLE CONTENT */}
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={() => {
            if (showDropdown) {
              setShowDropdown(false);
            }
          }}
          scrollEventThrottle={16}
        >
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
          <View style={[styles.mealCard, showDropdown && styles.mealCardDropdownOpen]}>
            <View style={styles.mealHeader}>
              <Ionicons name="time" size={18} color="#4A90E2" />
              <Text style={styles.mealLabel}>Meal Time</Text>
            </View>

            <View style={styles.mealSelectorContainer}>
              <TouchableOpacity
                style={[
                  styles.mealSelector,
                  showDropdown && styles.mealSelectorActive
                ]}
                onPress={() => setShowDropdown(!showDropdown)}
                activeOpacity={0.7}
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
                  {mealOptions.map((m, index) => (
                    <TouchableOpacity
                      key={m}
                      style={[
                        styles.dropdownItem,
                        index === mealOptions.length - 1 && styles.dropdownItemLast,
                        meal === m && styles.dropdownItemActive,
                      ]}
                      onPress={() => {
                        setMeal(m);
                        setShowDropdown(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.dropdownItemText,
                        meal === m && styles.dropdownItemTextActive,
                      ]}>
                        {m}
                      </Text>
                      {meal === m && (
                        <Ionicons name="checkmark" size={18} color="#4A90E2" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
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
        </ScrollView>

        {/* Log Button - Fixed at Bottom */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.logButton} onPress={logMeal}>
            <Ionicons name="checkmark-circle" size={22} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.logText}>Log Food</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { 
    flex: 1, 
    backgroundColor: "#E8F0FF",
  },
  container: {
    flex: 1,
    backgroundColor: "#E8F0FF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#E8F0FF",
  },
  backButton: {
    padding: 8,
    zIndex: 10,
  },
  headerSpacer: {
    flex: 1,
  },
  messageBox: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    ...Platform.select({
      android: {
        elevation: 4,
      },
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
    }),
  },
  successBox: { backgroundColor: "#DFF2BF" },
  errorBox: { backgroundColor: "#FFD2D2" },
  messageText: { fontSize: 14, fontWeight: "600", color: "#333" },
  titleContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#E8F0FF",
  },
  foodTitle: {
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    color: "#333",
    marginBottom: 4,
  },
  servingInfo: {
    fontSize: 15,
    textAlign: "center",
    color: "#666",
    fontWeight: "500",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },

  servingsCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      android: {
        elevation: 2,
      },
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
    }),
  },
  servingsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
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
    marginBottom: 14,
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
    includeFontPadding: false,
  },
  quickServings: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
  },
  quickBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
  },
  quickBtnActive: {
    backgroundColor: "#4A90E2",
  },
  quickBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
  },
  quickBtnTextActive: {
    color: "#fff",
  },

  mealCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    zIndex: 10,
    ...Platform.select({
      android: {
        elevation: 2,
      },
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
    }),
  },
  mealCardDropdownOpen: {
    zIndex: 1000,
    ...Platform.select({
      android: {
        elevation: 10,
      },
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
    }),
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
  mealSelectorContainer: {
    position: "relative",
    zIndex: 1001,
  },
  mealSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F7F9FF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 10,
    padding: 14,
  },
  mealSelectorActive: {
    borderColor: "#4A90E2",
    borderWidth: 2,
  },
  mealText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#333",
  },
  dropdownOverlay: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    marginTop: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    zIndex: 1002,
    overflow: "hidden",
    ...Platform.select({
      android: {
        elevation: 12,
      },
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
    }),
  },
  dropdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    backgroundColor: "#fff",
  },
  dropdownItemLast: {
    borderBottomWidth: 0,
  },
  dropdownItemActive: {
    backgroundColor: "#F0F7FF",
  },
  dropdownItemText: {
    fontSize: 15,
    color: "#333",
    fontWeight: "500",
  },
  dropdownItemTextActive: {
    color: "#4A90E2",
    fontWeight: "600",
  },

  nutritionCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    zIndex: 1,
    ...Platform.select({
      android: {
        elevation: 2,
      },
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
    }),
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
    fontSize: 12,
    color: "#666",
    marginBottom: 14,
    marginLeft: 32,
  },
  caloriesBox: {
    backgroundColor: "#F0F7FF",
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  caloriesValue: {
    fontSize: 40,
    fontWeight: "700",
    color: "#4A90E2",
    includeFontPadding: false,
  },
  caloriesLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginTop: 4,
  },
  macrosGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  macroItem: {
    flex: 1,
    alignItems: "center",
  },
  macroIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  macroValue: {
    fontSize: 17,
    fontWeight: "700",
    color: "#333",
    marginBottom: 2,
    includeFontPadding: false,
  },
  macroLabel: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },

  buttonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'android' ? 16 : 12,
    backgroundColor: "#E8F0FF",
  },
  logButton: {
    flexDirection: "row",
    backgroundColor: "#4A90E2",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      android: {
        elevation: 3,
      },
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
    }),
  },
  logText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
});