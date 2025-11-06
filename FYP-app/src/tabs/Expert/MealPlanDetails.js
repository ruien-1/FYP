import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import API from "../../api/backend";
import { auth } from "../../firebaseConfig";

export default function MealPlanDetails() {
  const navigation = useNavigation();
  const route = useRoute();
  const { mealPlanDetails } = route.params || {};
  const uid = auth.currentUser?.uid;

  // Check if this is a 1 week plan (has days array) or 1 day plan (has meals array)
  const isOneWeekPlan = mealPlanDetails?.days && Array.isArray(mealPlanDetails.days) && mealPlanDetails.days.length > 0;
  const meals = isOneWeekPlan ? [] : (mealPlanDetails?.meals || []);
  const days = isOneWeekPlan ? (mealPlanDetails?.days || []) : [];

  // Calculate total meal count
  const totalMealCount = useMemo(() => {
    if (isOneWeekPlan) {
      return days.reduce((total, day) => total + (day.meals?.length || 0), 0);
    }
    return meals.length;
  }, [isOneWeekPlan, meals, days]);

  const totalCalories = useMemo(() => {
    if (mealPlanDetails?.caloriesTotal !== undefined) {
      return Number(mealPlanDetails.caloriesTotal) || 0;
    }
    if (isOneWeekPlan) {
      const allMeals = days.flatMap(day => day.meals || []);
      return allMeals.reduce((acc, m) => acc + (Number(m.calories) || 0), 0);
    }
    const sum = (mealPlanDetails?.meals || []).reduce((acc, m) => acc + (Number(m.calories) || 0), 0);
    return sum;
  }, [mealPlanDetails, isOneWeekPlan, days]);

  const handleLogMeal = async () => {
    try {
      if (!uid) {
        Alert.alert("Not logged in", "Please login to log meals.");
        return;
      }

      if (isOneWeekPlan) {
        // For 1 week plans, log meals for today's date only
        const today = new Date().toISOString().split("T")[0];
        const todayDay = days.find(day => day.date === today);
        
        if (!todayDay || !todayDay.meals || todayDay.meals.length === 0) {
          Alert.alert("No Meals Today", "There are no meals scheduled for today in this meal plan.");
          return;
        }

        const totalGoal = Number(mealPlanDetails?.calorieGoal || 0) || 0;
        const totalProtein = Number(mealPlanDetails?.nutrients?.protein || 0) || 0;
        const totalCarbs = Number(mealPlanDetails?.nutrients?.carbs || 0) || 0;
        const totalFats = Number(mealPlanDetails?.nutrients?.fats || 0) || 0;

        const count = Math.max(todayDay.meals.length, 1);
        const defaultPerMealCal = Math.round(totalGoal / count) || 0;
        const defaultPerProtein = Math.round(totalProtein / count) || 0;
        const defaultPerCarbs = Math.round(totalCarbs / count) || 0;
        const defaultPerFats = Math.round(totalFats / count) || 0;

        // Log each meal entry for today
        for (const m of todayDay.meals) {
          const mealType = (m.mealTime || '').toLowerCase();
          const kcal = Number(m.calories) || defaultPerMealCal;
          const protein = Number(m.protein) || defaultPerProtein;
          const carbs = Number(m.carbs) || defaultPerCarbs;
          const fats = Number(m.fats) || defaultPerFats;
          const mealLog = {
            mealType: ["breakfast", "lunch", "dinner", "snack"].includes(mealType) ? mealType : "breakfast",
            date: today,
            food: m.food,
            servingSize: `${m.servings} serving(s), ${m.amount}g`,
            servings: Number(m.servings) || 1,
            calories: kcal,
            protein,
            carbs,
            fats,
          };
          await API.post(`/meals_log/${uid}`, mealLog);
        }

        Alert.alert("Logged", "Today's meals added to your diary.", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      } else {
        // For 1 day plans, use existing logic
        const today = new Date().toISOString().split("T")[0];
        const totalGoal = Number(mealPlanDetails?.calorieGoal || 0) || 0;
        const totalProtein = Number(mealPlanDetails?.nutrients?.protein || 0) || 0;
        const totalCarbs = Number(mealPlanDetails?.nutrients?.carbs || 0) || 0;
        const totalFats = Number(mealPlanDetails?.nutrients?.fats || 0) || 0;

        const count = Math.max(meals.length, 1);
        const defaultPerMealCal = Math.round(totalGoal / count) || 0;
        const defaultPerProtein = Math.round(totalProtein / count) || 0;
        const defaultPerCarbs = Math.round(totalCarbs / count) || 0;
        const defaultPerFats = Math.round(totalFats / count) || 0;

        // Log each meal entry as a separate diary record
        for (const m of meals) {
          const mealType = (m.mealTime || '').toLowerCase();
          const kcal = Number(m.calories) || defaultPerMealCal;
          const protein = Number(m.protein) || defaultPerProtein;
          const carbs = Number(m.carbs) || defaultPerCarbs;
          const fats = Number(m.fats) || defaultPerFats;
          const mealLog = {
            mealType: ["breakfast", "lunch", "dinner", "snack"].includes(mealType) ? mealType : "breakfast",
            date: today,
            food: m.food,
            servingSize: `${m.servings} serving(s), ${m.amount}g`,
            servings: Number(m.servings) || 1,
            calories: kcal,
            protein,
            carbs,
            fats,
          };
          await API.post(`/meals_log/${uid}`, mealLog);
        }

        Alert.alert("Logged", "Meals added to your diary.", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      }
    } catch (err) {
      console.error("Error logging meal plan:", err);
      Alert.alert("Error", "Failed to log meals. Please try again.");
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={26} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Meal Plan</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.planTitle}>{mealPlanDetails?.title || "Meal Plan"}</Text>
          <Text style={styles.meta}>Duration: {mealPlanDetails?.duration || "-"}</Text>
          {isOneWeekPlan && mealPlanDetails?.startDate && mealPlanDetails?.endDate && (
            <Text style={styles.meta}>
              Date Range: {new Date(mealPlanDetails.startDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })} - {new Date(mealPlanDetails.endDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </Text>
          )}
          {mealPlanDetails?.description ? (
            <Text style={styles.description}>{mealPlanDetails.description}</Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Meals ({totalMealCount})</Text>
          {isOneWeekPlan ? (
            // Render 1 week plan with days
            days.map((day) => (
              <View key={day.id} style={styles.dayContainer}>
                <View style={styles.dayHeader}>
                  <Text style={styles.dayLabel}>{day.label}</Text>
                  <Text style={styles.dayMealCount}>({day.meals?.length || 0} meals)</Text>
                </View>
                {day.meals && day.meals.length > 0 ? (
                  day.meals.map((m) => (
                    <View key={m.id} style={styles.mealCard}>
                      <View style={styles.mealCardHeader}>
                        <View style={styles.mealHeaderLeft}>
                          <View style={styles.mealIcon}><Text>🍽️</Text></View>
                          <View style={{ flexShrink: 1 }}>
                            <Text style={styles.mealName}>{m.food}</Text>
                            <Text style={styles.mealMeta}>{m.mealTime} • {m.servings} serving(s) • {m.amount}g</Text>
                          </View>
                        </View>
                        <View style={styles.macrosRow}>
                          <View style={[styles.macroPill, styles.macroPillBlue]}><Text style={styles.macroPillTextBlue}>{m.calories || 0} kcal</Text></View>
                          <View style={[styles.macroPill, styles.macroPillBlue]}><Text style={styles.macroPillTextBlue}>P {m.protein || 0}g</Text></View>
                          <View style={[styles.macroPill, styles.macroPillBlue]}><Text style={styles.macroPillTextBlue}>C {m.carbs || 0}g</Text></View>
                          <View style={[styles.macroPill, styles.macroPillBlue]}><Text style={styles.macroPillTextBlue}>F {m.fats || 0}g</Text></View>
                        </View>
                      </View>

                      {Array.isArray(m.ingredients) && m.ingredients.length > 0 && (
                        <View style={styles.detailBlock}>
                          <Text style={styles.detailBlockTitle}>Ingredients</Text>
                          <View style={styles.bulletList}>
                            {m.ingredients.map((ing, idx) => (
                              <View key={`ing-${idx}`} style={styles.bulletItem}>
                                <View style={styles.bulletDot} />
                                <Text style={styles.bulletText}>{ing}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      )}

                      {Array.isArray(m.instructions) && m.instructions.length > 0 && (
                        <View style={styles.detailBlock}>
                          <Text style={styles.detailBlockTitle}>Instructions</Text>
                          <View style={styles.numberList}>
                            {m.instructions.map((step, idx) => (
                              <View key={`step-${idx}`} style={styles.numberItem}>
                                <View style={styles.numberBadge}><Text style={styles.numberBadgeText}>{idx + 1}</Text></View>
                                <Text style={styles.bulletText}>{step}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      )}
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyDayText}>No meals scheduled for this day</Text>
                )}
              </View>
            ))
          ) : (
            // Render 1 day plan with meals array
            meals.map((m) => (
              <View key={m.id} style={styles.mealCard}>
                <View style={styles.mealCardHeader}>
                  <View style={styles.mealHeaderLeft}>
                    <View style={styles.mealIcon}><Text>🍽️</Text></View>
                    <View style={{ flexShrink: 1 }}>
                      <Text style={styles.mealName}>{m.food}</Text>
                      <Text style={styles.mealMeta}>{m.mealTime} • {m.servings} serving(s) • {m.amount}g</Text>
                    </View>
                  </View>
                  <View style={styles.macrosRow}>
                    <View style={[styles.macroPill, styles.macroPillBlue]}><Text style={styles.macroPillTextBlue}>{m.calories || 0} kcal</Text></View>
                    <View style={[styles.macroPill, styles.macroPillBlue]}><Text style={styles.macroPillTextBlue}>P {m.protein || 0}g</Text></View>
                    <View style={[styles.macroPill, styles.macroPillBlue]}><Text style={styles.macroPillTextBlue}>C {m.carbs || 0}g</Text></View>
                    <View style={[styles.macroPill, styles.macroPillBlue]}><Text style={styles.macroPillTextBlue}>F {m.fats || 0}g</Text></View>
                  </View>
                </View>

                {Array.isArray(m.ingredients) && m.ingredients.length > 0 && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.detailBlockTitle}>Ingredients</Text>
                    <View style={styles.bulletList}>
                      {m.ingredients.map((ing, idx) => (
                        <View key={`ing-${idx}`} style={styles.bulletItem}>
                          <View style={styles.bulletDot} />
                          <Text style={styles.bulletText}>{ing}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {Array.isArray(m.instructions) && m.instructions.length > 0 && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.detailBlockTitle}>Instructions</Text>
                    <View style={styles.numberList}>
                      {m.instructions.map((step, idx) => (
                        <View key={`step-${idx}`} style={styles.numberItem}>
                          <View style={styles.numberBadge}><Text style={styles.numberBadgeText}>{idx + 1}</Text></View>
                          <Text style={styles.bulletText}>{step}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Nutrients Breakdown</Text>
          <View style={styles.nutrientsGrid}>
            <View style={styles.nutrientBox}>
              <Text style={styles.nutrientValue}>{mealPlanDetails?.caloriesTotal || 0}</Text>
              <Text style={styles.nutrientLabel}>Calories (kcal)</Text>
            </View>
            <View style={styles.nutrientBox}>
              <Text style={styles.nutrientValue}>{mealPlanDetails?.nutrients?.protein || 0}</Text>
              <Text style={styles.nutrientLabel}>Protein (g)</Text>
            </View>
            <View style={styles.nutrientBox}>
              <Text style={styles.nutrientValue}>{mealPlanDetails?.nutrients?.carbs || 0}</Text>
              <Text style={styles.nutrientLabel}>Carbs (g)</Text>
            </View>
            <View style={styles.nutrientBox}>
              <Text style={styles.nutrientValue}>{mealPlanDetails?.nutrients?.fats || 0}</Text>
              <Text style={styles.nutrientLabel}>Fats (g)</Text>
            </View>
          </View>
        </View>

        {mealPlanDetails?.notes || mealPlanDetails?.comments ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Other Comments</Text>
            <Text style={styles.description}>{mealPlanDetails?.notes || mealPlanDetails?.comments}</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.logButton} onPress={handleLogMeal}>
          <Text style={styles.logButtonText}>
            {isOneWeekPlan ? "Log Today's Meals" : "Log Meal"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#E8F0FF" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  backButton: { padding: 6 },
  title: { fontSize: 20, fontWeight: "700", color: "#000" },
  content: { padding: 16, paddingBottom: 120 },
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 14, elevation: 1 },
  planTitle: { fontSize: 18, fontWeight: "700", color: "#000", marginBottom: 6 },
  meta: { fontSize: 14, color: "#555", marginBottom: 4 },
  description: { fontSize: 14, color: "#333", marginTop: 6 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#000", marginBottom: 12 },
  row: { flexDirection: "row", gap: 8 },
  pill: { backgroundColor: "#F0F8FF", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  pillText: { color: "#007AFF", fontWeight: "700", fontSize: 12 },
  mealCard: { backgroundColor: "#FAFBFF", borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: "#EEF2FF" },
  mealCardHeader: { marginBottom: 10 },
  mealHeaderLeft: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  mealIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#F3F7FF", alignItems: "center", justifyContent: "center", marginRight: 10 },
  mealName: { fontSize: 16, fontWeight: "700", color: "#000" },
  mealMeta: { fontSize: 12, color: "#666", marginTop: 2 },
  macrosRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  macroPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
  macroPillBlue: { backgroundColor: '#E8F4FF', borderWidth: 1, borderColor: '#D6EAFF' },
  macroPillTextBlue: { fontSize: 12, fontWeight: "700", color: "#007AFF" },
  detailBlock: { marginTop: 8 },
  detailBlockTitle: { fontSize: 14, fontWeight: "700", color: "#000", marginBottom: 6 },
  bulletList: { gap: 6 },
  bulletItem: { flexDirection: "row", alignItems: "flex-start" },
  bulletDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#007AFF", marginTop: 7, marginRight: 10 },
  bulletText: { fontSize: 13, color: "#333", lineHeight: 20, flex: 1 },
  numberList: { gap: 8 },
  numberItem: { flexDirection: "row", alignItems: "flex-start" },
  numberBadge: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#007AFF", alignItems: "center", justifyContent: "center", marginRight: 10 },
  numberBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  
  // New nutrient grid layout
  nutrientsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  nutrientBox: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#F0F8FF",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D6EAFF",
  },
  nutrientValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#007AFF",
    marginBottom: 4,
  },
  nutrientLabel: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "#fff", padding: 12, borderTopWidth: 1, borderTopColor: "#EEE" },
  logButton: { backgroundColor: "#007AFF", borderRadius: 10, alignItems: "center", paddingVertical: 14 },
  logButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  // Day container styles for 1 week plans
  dayContainer: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  dayLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#007AFF",
    flex: 1,
  },
  dayMealCount: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },
  emptyDayText: {
    fontSize: 13,
    color: "#999",
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 8,
  },
});