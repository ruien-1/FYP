import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";

// 🔹 Backend API
import API from "../../api/backend";

export default function DeleteFoods() {
  const navigation = useNavigation();
  const route = useRoute();

  const { mealType, uid, selectedDate } = route.params || {};
  const [foodsList, setFoodsList] = useState([]);
  const [selectedFoods, setSelectedFoods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const toggleFoodSelection = (id) => {
    setSelectedFoods((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const fetchFoods = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/meals_log/${uid}`);
      const allMeals = res.data || [];

      const filtered = allMeals.filter((m) => {
        const dbMealType = (m.mealType || "").toLowerCase();
        const searchMealType = mealType.toLowerCase();
        const typeMatch = dbMealType === searchMealType;
        const dateMatch = m.date === selectedDate;
        return typeMatch && dateMatch;
      });

      setFoodsList(filtered);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching foods:", err);
      setMessage({ text: "❌ Could not fetch foods.", type: "error" });
      setLoading(false);
    }
  };

  useEffect(() => {
    if (uid && mealType && selectedDate) {
      fetchFoods();
    }
  }, [uid, mealType, selectedDate]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const deleteSingleFood = async (id) => {
    try {
      await API.delete(`/meals_log/${uid}/${id}`);
      setMessage({ text: "✅ Food has been deleted.", type: "success" });
      fetchFoods();
    } catch (err) {
      console.error("Error deleting food:", err);
      setMessage({ text: "❌ Could not delete food.", type: "error" });
    }
  };

  const deleteSelectedFoods = async () => {
    if (!selectedFoods.length) {
      setMessage({
        text: "⚠️ Please select at least one food to delete.",
        type: "error",
      });
      return;
    }

    try {
      for (const id of selectedFoods) {
        await API.delete(`/meals_log/${uid}/${id}`);
      }
      setMessage({
        text: "✅ Selected foods have been deleted.",
        type: "success",
      });
      setSelectedFoods([]);
      fetchFoods();
    } catch (err) {
      console.error("Error deleting foods:", err);
      setMessage({ text: "❌ Could not delete foods.", type: "error" });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator
          size="large"
          color="#4A90E2"
          style={{ marginTop: 50 }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
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

      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={22} color="#333" />
        </TouchableOpacity>

        <Text style={styles.title}>Select {mealType} foods to delete</Text>

        {foodsList.length === 0 ? (
          <Text style={styles.emptyText}>No foods found for this meal.</Text>
        ) : (
          <View style={styles.foodList}>
            {foodsList.map((food) => {
              const isSelected = selectedFoods.includes(food.id);
              return (
                <View key={food.id} style={styles.foodItem}>
                  <TouchableOpacity
                    style={[
                      styles.checkbox,
                      { backgroundColor: isSelected ? "#4A90E2" : "#fff" },
                    ]}
                    onPress={() => toggleFoodSelection(food.id)}
                  >
                    {isSelected && (
                      <Ionicons name="checkmark" size={18} color="#fff" />
                    )}
                  </TouchableOpacity>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.foodText}>{food.food}</Text>
                    <Text style={styles.foodInfo}>{food.calories} kcal</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => deleteSingleFood(food.id)}
                  >
                    <Ionicons name="trash" size={18} color="#333" />
                    <Text style={styles.deleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {foodsList.length > 0 && (
          <TouchableOpacity
            style={styles.deleteFoodsBtn}
            onPress={deleteSelectedFoods}
          >
            <Text style={styles.deleteFoodsText}>Delete Selected</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#E8F0FF" },
  container: { padding: 20 },
  backBtn: { marginBottom: 20 },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginVertical: 20,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#777",
    textAlign: "center",
    marginTop: 40,
  },
  foodList: { marginBottom: 30 },
  foodItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
  },
  foodText: { fontSize: 15, fontWeight: "500", color: "#333" },
  foodInfo: { fontSize: 13, color: "#777" },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F7FB",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  deleteText: { fontSize: 13, color: "#333", marginLeft: 4 },
  deleteFoodsBtn: {
    backgroundColor: "#4A90E2",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  deleteFoodsText: { color: "#fff", fontSize: 16, fontWeight: "600" },

  // ✅ Fixed message banner so it shows below notch
  messageBox: {
    position: "absolute",
    top: 50, // push down so it's not hidden by notch
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
});
