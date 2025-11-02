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

  const meals = mealPlanDetails?.meals || [];

  const totalCalories = useMemo(() => {
    if (mealPlanDetails?.caloriesTotal !== undefined) {
      return Number(mealPlanDetails.caloriesTotal) || 0;
    }
    const sum = (mealPlanDetails?.meals || []).reduce((acc, m) => acc + (Number(m.calories) || 0), 0);
    return sum;
  }, [mealPlanDetails]);

  const handleLogMeal = async () => {
    try {
      if (!uid) {
        Alert.alert("Not logged in", "Please login to log meals.");
        return;
      }

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
          {mealPlanDetails?.description ? (
            <Text style={styles.description}>{mealPlanDetails.description}</Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Meals ({meals.length})</Text>
          {meals.map((m) => (
            <View key={m.id} style={styles.mealRow}>
              <View style={styles.mealLeft}>
                <View style={styles.mealIcon}><Text>🍽️</Text></View>
                <View style={{ flexShrink: 1 }}>
                  <Text style={styles.mealName}>{m.food}</Text>
                  <Text style={styles.mealMeta}>{m.mealTime} • {m.servings} serving(s) • {m.amount}g</Text>
                  <Text style={styles.mealMeta}>
                    Calories: {m.calories || 0} kcal • P {m.protein || 0}g • C {m.carbs || 0}g • F {m.fats || 0}g
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Nutrients Breakdown</Text>
          <View style={styles.row}>
            <View style={styles.pill}><Text style={styles.pillText}>Calories: {mealPlanDetails?.caloriesTotal || 0} kcal</Text></View>
            <View style={styles.pill}><Text style={styles.pillText}>Protein: {mealPlanDetails?.nutrients?.protein || 0} g</Text></View>
            <View style={styles.pill}><Text style={styles.pillText}>Carbs: {mealPlanDetails?.nutrients?.carbs || 0} g</Text></View>
            <View style={styles.pill}><Text style={styles.pillText}>Fats: {mealPlanDetails?.nutrients?.fats || 0} g</Text></View>
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
          <Text style={styles.logButtonText}>Log Meal</Text>
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
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 12, elevation: 1 },
  planTitle: { fontSize: 18, fontWeight: "700", color: "#000", marginBottom: 6 },
  meta: { fontSize: 14, color: "#555", marginBottom: 4 },
  description: { fontSize: 14, color: "#333", marginTop: 6 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#000", marginBottom: 10 },
  row: { flexDirection: "row", gap: 8 },
  pill: { backgroundColor: "#F0F8FF", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  pillText: { color: "#007AFF", fontWeight: "700", fontSize: 12 },
  mealRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F1F1F1" },
  mealLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  mealIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#F3F7FF", alignItems: "center", justifyContent: "center", marginRight: 10 },
  mealName: { fontSize: 15, fontWeight: "600", color: "#000" },
  mealMeta: { fontSize: 12, color: "#666", marginTop: 2 },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "#fff", padding: 12, borderTopWidth: 1, borderTopColor: "#EEE" },
  logButton: { backgroundColor: "#007AFF", borderRadius: 10, alignItems: "center", paddingVertical: 14 },
  logButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});


