// NutritionistPendingAction.js - For accepted meal plan requests that need further action
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { auth, db } from "../../firebaseConfig";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import API from "../../api/backend";

export default function NutritionistPendingAction() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [mealPlans, setMealPlans] = useState([]);
  const currentUser = auth.currentUser;

  useEffect(() => {
    fetchAcceptedMealPlans();
  }, []);

  const fetchAcceptedMealPlans = async () => {
    try {
      setLoading(true);

      const response = await API.get("/meal-plans/nutritionist", {
        params: { nutritionistId: currentUser.uid, status: "confirmed" },
      });

      const mealPlanData = response.data?.data || [];
      setMealPlans(mealPlanData);
    } catch (error) {
      console.error("Error fetching accepted meal plans:", error);
    } finally {
      setLoading(false);
    }
  };

  const sendChatMessage = async (mealPlan, messageText) => {
    try {
      const userId = mealPlan.userId;
      const chatId = currentUser.uid > userId
        ? `${currentUser.uid}_${userId}`
        : `${userId}_${currentUser.uid}`;

      await addDoc(collection(db, "chats", chatId, "messages"), {
        _id: Math.random().toString(36).substring(7),
        text: messageText,
        createdAt: serverTimestamp(),
        user: {
          _id: currentUser.uid,
          name: currentUser.displayName || "Nutritionist",
        },
        mealPlanId: mealPlan.id,
        isMealPlanResponse: true,
        read: false,
      });

      console.log('✅ Chat message sent successfully');
    } catch (error) {
      console.error('❌ Error sending chat message:', error);
    }
  };

  const handleCreateMealPlan = (mealPlan) => {
    // Navigate to CreateMealPlan screen with meal plan data
    navigation.navigate("CreateMealPlan", {
      mealPlan: mealPlan
    });
  };

  const handleSendMessage = async (mealPlan) => {
    try {
      const userId = mealPlan.userId;
      const chatId = currentUser.uid > userId
        ? `${currentUser.uid}_${userId}`
        : `${userId}_${currentUser.uid}`;

      // Navigate to the Messages tab first, then to the specific chat
      navigation.navigate("Messages", {
        screen: "NutritionistChatScreen",
        params: {
          userId: userId,
          userName: mealPlan.userName,
          chatId: chatId,
        }
      });
    } catch (error) {
      console.error("Error navigating to chat:", error);
    }
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 60 }}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pending Actions</Text>
      </View>

      {/* Description */}
      <View style={styles.descriptionContainer}>
        <Text style={styles.descriptionText}>
          These are accepted meal plan requests that require your action to complete.
        </Text>
      </View>

      {/* Meal Plans */}
      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 30 }} />
      ) : mealPlans.length === 0 ? (
        <Text style={styles.emptyText}>
          No pending meal plan actions.
        </Text>
      ) : (
        mealPlans.map((mealPlan) => (
          <View key={mealPlan.id} style={styles.card}>
            <View style={styles.row}>
              <Ionicons name="restaurant-outline" size={26} color="#007AFF" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.name}>{mealPlan.userName}</Text>
                <Text style={styles.duration}>
                  🥗 {mealPlan.duration} meal plan
                </Text>
                <Text style={styles.date}>
                  Requested on {formatDate(mealPlan.createdAt)}
                </Text>
                {mealPlan.requestMessage && (
                  <Text style={styles.message}>
                    "{mealPlan.requestMessage}"
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.messageButton]}
                onPress={() => handleSendMessage(mealPlan)}
              >
                <Ionicons name="chatbubble-outline" size={18} color="#007AFF" />
                <Text style={styles.messageButtonText}>Message</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.completeButton]}
                onPress={() => handleCreateMealPlan(mealPlan)}
              >
                <Ionicons name="restaurant-outline" size={18} color="#fff" />
                <Text style={styles.completeButtonText}>Create Meal Plan</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EAF3FF",
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 60,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#000",
    marginLeft: 10,
  },
  descriptionContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#007AFF",
  },
  descriptionText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  emptyText: {
    textAlign: "center",
    color: "#666",
    fontSize: 16,
    marginTop: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  duration: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "500",
    marginTop: 2,
  },
  date: {
    fontSize: 13,
    color: "#555",
    marginTop: 2,
  },
  message: {
    fontSize: 13,
    color: "#666",
    fontStyle: "italic",
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    gap: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  messageButton: {
    backgroundColor: "#F0F8FF",
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  messageButtonText: {
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "600",
  },
  completeButton: {
    backgroundColor: "#34C759",
  },
  completeButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});

