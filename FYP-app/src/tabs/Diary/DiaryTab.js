import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useIsFocused } from "@react-navigation/native";

import API from "../../api/backend";
import { auth } from "../../firebaseConfig";

export default function DiaryTab({ navigation }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const isFocused = useIsFocused();

  const [userInfo, setUserInfo] = useState(null);

  const [diaryData, setDiaryData] = useState({
    calories: { consumed: 0, target: 0 },
    meals: { breakfast: [], lunch: [], dinner: [], snack: [] },
    activity: { totalCalories: 0, activities: [] },
  });

  const [waterAmount, setWaterAmount] = useState(0);
  const [weight, setWeight] = useState(null);


  const changeDate = (days) => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + days);
    setSelectedDate(next);
  };

  const formatDate = (date) => date.toISOString().split("T")[0];

  const fetchUserInfo = async (uid) => {
    try {
      const res = await API.get(`/user_info/${uid}`);
      setUserInfo(res.data);
    } catch (err) {
      console.error("Error fetching user info:", err);
    }
  };

  const calculateCalories = (user) => {
    if (!user) return 0;
    const { weight, height, age, gender, activityLevel } = user;
    const w = parseFloat(weight);
    const h = parseFloat(height);
    const a = parseInt(age);
    const g = (gender || "").toLowerCase();
    let bmr =
      g === "male" || g === "m"
        ? 10 * w + 6.25 * h - 5 * a + 5
        : 10 * w + 6.25 * h - 5 * a - 161;
    let multiplier = 1.2;
    switch ((activityLevel || "").toLowerCase()) {
      case "not very active":
        multiplier = 1.2;
        break;
      case "lightly active":
        multiplier = 1.375;
        break;
      case "active":
        multiplier = 1.55;
        break;
      case "very active":
        multiplier = 1.725;
        break;
      default:
        multiplier = 1.2;
    }
    return Math.round(bmr * multiplier);
  };

  const fetchMeals = async () => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const res = await API.get(`/meals_log/${uid}`);
      const meals = res.data;

      let mealsGrouped = { breakfast: [], lunch: [], dinner: [], snack: [] };
      let totalCalories = 0;

      meals.forEach((m) => {
        if (m.date === formatDate(selectedDate)) {
          let mealType = (m.mealType || "").toLowerCase();
          if (mealsGrouped[mealType]) mealsGrouped[mealType].push(m);
          totalCalories += m.calories || 0;
        }
      });

      setDiaryData((prev) => ({
        ...prev,
        calories: {
          consumed: totalCalories,
          target: calculateCalories(userInfo),
        },
        meals: mealsGrouped,
      }));
    } catch (err) {
      console.error("Error fetching meals:", err);
    }
  };

  const fetchWater = async () => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const res = await API.get(
        `/water_log/${uid}?date=${formatDate(selectedDate)}`
      );
      const entries = Array.isArray(res.data) ? res.data : [];
      const lastEntry = entries.length > 0 ? entries[entries.length - 1] : null;
      setWaterAmount(lastEntry ? lastEntry.water : 0);
    } catch (err) {
      console.error("Error fetching water:", err);
    }
  };

  const fetchActivity = async () => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const res = await API.get(
        `/activity_log/${uid}?date=${formatDate(selectedDate)}`
      );
      const activities = Array.isArray(res.data) ? res.data : [];
      let totalCalories = activities.reduce(
        (sum, act) => sum + (act.calories || 0),
        0
      );

      setDiaryData((prev) => ({
        ...prev,
        activity: { totalCalories, activities },
      }));
    } catch (err) {
      console.error("Error fetching activities:", err);
    }
  };

  const fetchWeight = async () => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      // Call the backend daily_summary route for the selected date
      const res = await API.get(`/daily_summary/${uid}?date=${formatDate(selectedDate)}`);
      const summary = res.data;

      // summary.weight should contain the logged weight for that date
      setWeight(summary?.weight ?? null);
    } catch (err) {
      console.error("Error fetching weight:", err);
      setWeight(null);
    }
  };



  // Auto-post to /daily_summary whenever values change
  const updateDailySummary = async () => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const date = formatDate(selectedDate);
      const caloriesEaten = diaryData.calories.consumed;
      const caloriesBurned = diaryData.activity.totalCalories;
      const remainingCalories =
        diaryData.calories.target - (caloriesEaten - caloriesBurned);

      await API.post(`/daily_summary/${uid}`, {
        date,
        caloriesEaten,
        caloriesBurned,
        remainingCalories,
      });

      console.log("Daily summary updated successfully");
    } catch (err) {
      console.error("Error posting daily summary:", err);
    }
  };

  // 🔁 Fetch data when screen changes
  useEffect(() => {
    const loadData = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      if (!userInfo) await fetchUserInfo(uid);
      if (isFocused && userInfo) {
        await fetchMeals();
        await fetchWater();
        await fetchActivity();
        await fetchWeight();
      }
    };
    loadData();
  }, [selectedDate, isFocused, userInfo]);

  // 🔄 Auto-update summary whenever data changes
  useEffect(() => {
    if (userInfo && auth.currentUser?.uid) {
      updateDailySummary();
    }
  }, [diaryData, userInfo]);

  const renderPlusMinus = (onPlus, onMinus) => (
    <View style={styles.pmContainer}>
      <TouchableOpacity style={styles.pmBtn} onPress={onMinus}>
        <Ionicons name="remove" size={18} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.pmBtn} onPress={onPlus}>
        <Ionicons name="add" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  const renderPlusOnly = (onPlus) => (
    <View style={styles.pmContainer}>
      <TouchableOpacity style={styles.pmBtn} onPress={onPlus}>
        <Ionicons name="add" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  const meals = [
    {
      key: "breakfast",
      title: "Breakfast",
      detail: diaryData.meals.breakfast.length
        ? diaryData.meals.breakfast
            .map((m) => `${m.food} (${m.calories} kcal)`)
            .join(", ")
        : "-",
      icon: "cafe",
      color: "#FFE9A0",
    },
    {
      key: "lunch",
      title: "Lunch",
      detail: diaryData.meals.lunch.length
        ? diaryData.meals.lunch
            .map((m) => `${m.food} (${m.calories} kcal)`)
            .join(", ")
        : "-",
      icon: "fast-food",
      color: "#FFD6A5",
    },
    {
      key: "dinner",
      title: "Dinner",
      detail: diaryData.meals.dinner.length
        ? diaryData.meals.dinner
            .map((m) => `${m.food} (${m.calories} kcal)`)
            .join(", ")
        : "-",
      icon: "restaurant",
      color: "#A0E7E5",
    },
    {
      key: "snack",
      title: "Snacks",
      detail: diaryData.meals.snack.length
        ? diaryData.meals.snack
            .map((m) => `${m.food} (${m.calories} kcal)`)
            .join(", ")
        : "-",
      icon: "ice-cream",
      color: "#B4F8C8",
    },
  ];

  const netCalories =
    diaryData.calories.consumed - diaryData.activity.totalCalories;
  const remaining = diaryData.calories.target - netCalories;

  return (
    <SafeAreaView style={styles.safeArea}>
      <TouchableWithoutFeedback
        onPress={() => {
          if (showPicker) setShowPicker(false);
          Keyboard.dismiss();
        }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollInner}
          keyboardShouldPersistTaps="handled"
        >
          <View>
            {/* Date Header */}
            <View style={styles.dateHeader}>
              <TouchableOpacity onPress={() => changeDate(-1)}>
                <Ionicons name="chevron-back" size={22} color="#333" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowPicker(true)}>
                <Text style={styles.dateText}>
                  {selectedDate.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => changeDate(1)}>
                <Ionicons name="chevron-forward" size={22} color="#333" />
              </TouchableOpacity>
            </View>

            {showPicker && (
              <View style={styles.pickerOverlay}>
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display={Platform.OS === "ios" ? "inline" : "default"}
                  onChange={(e, date) => {
                    if (date) setSelectedDate(date);
                    setShowPicker(false);
                  }}
                />
              </View>
            )}

            {/* Calories Overview */}
            <View style={styles.caloriesSection}>
              <View style={styles.mainCircleContainer}>
                <View style={styles.mainCircle}>
                  <Text style={styles.remainingNumber}>
                    {remaining > 0
                      ? remaining.toLocaleString()
                      : Math.abs(remaining).toLocaleString()}
                  </Text>
                  <Text style={styles.remainingLabel}>Remaining</Text>
                  <Text style={styles.remainingUnit}>
                    {remaining > 0 ? "kcal left" : "kcal over"}
                  </Text>
                </View>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <View style={styles.statIcon}>
                    <Ionicons name="flag" size={20} color="#4A90E2" />
                  </View>
                  <Text style={styles.statNumber}>
                    {diaryData.calories.target.toLocaleString()}
                  </Text>
                  <Text style={styles.statLabel}>Daily Target</Text>
                </View>

                <View style={styles.statCard}>
                  <View style={styles.statIcon}>
                    <Text style={styles.statEmoji}>🍽️</Text>
                  </View>
                  <Text style={styles.statNumber}>
                    {diaryData.calories.consumed.toLocaleString()}
                  </Text>
                  <Text style={styles.statLabel}>Eaten</Text>
                </View>

                <View style={styles.statCard}>
                  <View style={styles.statIcon}>
                    <Text style={styles.statEmoji}>🔥</Text>
                  </View>
                  <Text style={styles.statNumber}>
                    {diaryData.activity.totalCalories.toLocaleString()}
                  </Text>
                  <Text style={styles.statLabel}>Burned</Text>
                </View>
              </View>
            </View>

            {/* Meal Log */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Meal Log</Text>
              {meals.map((meal) => (
                <View key={meal.key} style={styles.mealItem}>
                  <View style={styles.mealLeft}>
                    <View
                      style={[styles.iconCircle, { backgroundColor: meal.color }]}
                    >
                      <Ionicons name={meal.icon} size={22} color="#333" />
                    </View>
                    <View style={{ flexShrink: 1 }}>
                      <Text style={styles.mealText}>{meal.title}</Text>
                      <Text style={styles.mealCalories}>{meal.detail}</Text>
                    </View>
                  </View>
                  {renderPlusMinus(
                    () =>
                      navigation.navigate("MealLog", {
                        mealType: meal.key,
                        selectedDate: formatDate(selectedDate),
                        uid: auth.currentUser.uid,
                      }),
                    () =>
                      navigation.navigate("DeleteFoods", {
                        mealType: meal.key,
                        selectedDate: formatDate(selectedDate),
                        uid: auth.currentUser.uid,
                      })
                  )}
                </View>
              ))}
            </View>

            {/* Water Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Water Intake</Text>
              <View style={styles.mealItem}>
                <View style={styles.mealLeft}>
                  <View
                    style={[styles.iconCircle, { backgroundColor: "#B4E4FF" }]}
                  >
                    <Ionicons name="water" size={22} color="#333" />
                  </View>
                  <View style={{ flexShrink: 1 }}>
                    <Text style={styles.mealText}>Water</Text>
                    <Text style={styles.mealCalories}>{waterAmount} ml</Text>
                  </View>
                </View>
                {renderPlusOnly(() =>
                  navigation.navigate("WaterPage", {
                    selectedDate: formatDate(selectedDate),
                  })
                )}
              </View>
            </View>

            {/* Activities Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Activities</Text>
              {diaryData.activity.activities.length > 0 ? (
                diaryData.activity.activities.map((activity) => (
                  <View key={activity.id} style={styles.mealItem}>
                    <View style={styles.mealLeft}>
                      <View
                        style={[
                          styles.iconCircle,
                          { backgroundColor: "#FFBFA9" },
                        ]}
                      >
                        <Ionicons name="bicycle" size={22} color="#333" />
                      </View>
                      <View style={{ flexShrink: 1 }}>
                        <Text style={styles.mealText}>{activity.name}</Text>
                        <Text style={styles.mealCalories}>
                          {activity.duration} min • {activity.calories} kcal
                        </Text>
                      </View>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.mealItem}>
                  <View style={styles.mealLeft}>
                    <View
                      style={[styles.iconCircle, { backgroundColor: "#FFBFA9" }]}
                    >
                      <Ionicons name="bicycle" size={22} color="#333" />
                    </View>
                    <View style={{ flexShrink: 1 }}>
                      <Text style={styles.mealCalories}>
                        No activities logged
                      </Text>
                    </View>
                  </View>
                </View>
              )}
              <View style={styles.totalCaloriesContainer}>
                <Text style={styles.totalCaloriesText}>
                  Total: {diaryData.activity.totalCalories} kcal burned
                </Text>
              </View>
                <View style={styles.activityButtons}>
                  {renderPlusMinus(
                    () =>
                      navigation.navigate("ActivityPage", {
                        selectedDate: formatDate(selectedDate), // send date from DiaryTab
                      }),
                    () =>
                      navigation.navigate("DeleteActivity", {
                        uid: auth.currentUser.uid,
                        selectedDate: formatDate(selectedDate),
                      })
                  )}
                </View>
            </View>

            {/* Weight Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Weight Log</Text>
              <View style={styles.mealItem}>
                <View style={styles.mealLeft}>
                  <View
                    style={[styles.iconCircle, { backgroundColor: "#E5D1FA" }]}
                  >
                    <Ionicons name="barbell" size={22} color="#333" />
                  </View>
                  <View style={{ flexShrink: 1 }}>
                    <Text style={styles.mealText}>Weight</Text>
                    <Text style={styles.mealCalories}>
                      {weight !== null ? `${weight} kg` : "-"}
                    </Text>
                  </View>
                </View>
                {renderPlusOnly(() =>
                  navigation.navigate("WeightPage", {
                    selectedDate: formatDate(selectedDate),
                  })
                )}
              </View>
            </View>

          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#E8F0FF" },
  scrollInner: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 30, flexGrow: 1 },
  dateHeader: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginBottom: 8, paddingHorizontal: 20 },
  dateText: { fontSize: 18, fontWeight: "600", color: "#333", marginHorizontal: 16 },
  pickerOverlay: { position: "absolute", top: 60, left: 20, right: 20, zIndex: 100, backgroundColor: "#fff", borderRadius: 16, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 8, elevation: 6 },
  
  // Calories Section with Better Design
  caloriesSection: {
    marginTop: 20,
    marginBottom: 30,
    alignItems: "center",
  },
  mainCircleContainer: {
    position: "relative",
    width: 115,
    height: 115,
    marginBottom: 20,
  },
  mainCircle: {
    width: 115,
    height: 115,
    borderRadius: 57.5,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  remainingNumber: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 2,
  },
  remainingLabel: {
    fontSize: 10,
    color: "#6B7280",
    fontWeight: "600",
    marginBottom: 1,
  },
  remainingUnit: {
    fontSize: 9,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 8,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  statIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  statEmoji: {
    fontSize: 14,
  },
  statNumber: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 8,
    color: "#6B7280",
    fontWeight: "600",
  },

  // Card Styles
  card: { backgroundColor: "#fff", borderRadius: 20, padding: 18, marginTop: 10, marginBottom: 24, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, elevation: 3 },
  cardTitle: { fontSize: 16, fontWeight: "600", color: "#333", marginBottom: 12 },
  mealItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#F5F7FB", borderRadius: 14, paddingVertical: 12, paddingHorizontal: 10, marginBottom: 10 },
  mealLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center", marginRight: 10 },
  mealText: { fontSize: 15, fontWeight: "500", color: "#333" },
  mealCalories: { fontSize: 13, color: "#777", marginTop: 2 },
  pmContainer: { flexDirection: "row", alignItems: "center" },
  pmBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#4A90E2", justifyContent: "center", alignItems: "center", marginHorizontal: 4 },
  totalCaloriesContainer: { backgroundColor: "#F0F8FF", borderRadius: 12, padding: 12, marginTop: 4, alignItems: "center" },
  totalCaloriesText: { fontSize: 14, fontWeight: "600", color: "#4A90E2" },
  activityButtons: { flexDirection: "row", justifyContent: "center", marginTop: 8 },
});