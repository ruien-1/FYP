// CoachPendingAction.js - Coach: For accepted workout plan requests that need further action
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

export default function PendingAction() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [workoutPlans, setWorkoutPlans] = useState([]);
  const currentUser = auth.currentUser;

  useEffect(() => {
    fetchAcceptedWorkoutPlans();
  }, []);

  const fetchAcceptedWorkoutPlans = async () => {
    try {
      setLoading(true);

      const response = await API.get("/workout-plans/coach", {
        params: { coachId: currentUser.uid, status: "confirmed" },
      }).catch((err) => {
        console.error("Error fetching confirmed workout plans:", err);
        return { data: { data: [] } };
      });

      const workoutPlanData = response.data?.data || [];
      setWorkoutPlans(workoutPlanData);
    } catch (error) {
      console.error("Error fetching accepted workout plans:", error);
    } finally {
      setLoading(false);
    }
  };

  const sendChatMessage = async (workoutPlan, messageText) => {
    try {
      const userId = workoutPlan.userId;
      const chatId = currentUser.uid > userId
        ? `${currentUser.uid}_${userId}`
        : `${userId}_${currentUser.uid}`;

      await addDoc(collection(db, "chats", chatId, "messages"), {
        _id: Math.random().toString(36).substring(7),
        text: messageText,
        createdAt: serverTimestamp(),
        user: {
          _id: currentUser.uid,
          name: currentUser.displayName || "Coach",
        },
        workoutPlanId: workoutPlan.id,
        isWorkoutPlanResponse: true,
        read: false,
      });

      console.log('✅ Chat message sent successfully');
    } catch (error) {
      console.error('❌ Error sending chat message:', error);
    }
  };

  const handleCreateWorkoutPlan = (workoutPlan) => {
    navigation.navigate("CreateWorkoutPlan", {
      workoutPlan: workoutPlan
    });
  };

  const handleSendMessage = async (workoutPlan) => {
    try {
      const userId = workoutPlan.userId;
      const chatId = currentUser.uid > userId
        ? `${currentUser.uid}_${userId}`
        : `${userId}_${currentUser.uid}`;

      // Navigate via Messages tab to ensure correct stack
      navigation.navigate("Messages", {
        screen: "CoachChatScreen",
        params: {
          userId: userId,
          userName: workoutPlan.userName,
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
          These are accepted workout plan requests that require your action to complete.
        </Text>
      </View>

      {/* Workout Plans */}
      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 30 }} />
      ) : workoutPlans.length === 0 ? (
        <Text style={styles.emptyText}>
          No pending workout plan actions.
        </Text>
      ) : (
        workoutPlans.map((workoutPlan) => (
          <View key={workoutPlan.id} style={styles.card}>
            <View style={styles.row}>
              <Ionicons name="barbell-outline" size={26} color="#007AFF" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.name}>{workoutPlan.userName}</Text>
                <Text style={styles.duration}>
                  💪 1-week workout plan
                </Text>
                <Text style={styles.date}>
                  Requested on {formatDate(workoutPlan.createdAt)}
                </Text>
                {workoutPlan.requestMessage && (
                  <Text style={styles.message}>
                    "{workoutPlan.requestMessage}"
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.messageButton]}
                onPress={() => handleSendMessage(workoutPlan)}
              >
                <Ionicons name="chatbubble-outline" size={18} color="#007AFF" />
                <Text style={styles.messageButtonText}>Message</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.completeButton]}
                onPress={() => handleCreateWorkoutPlan(workoutPlan)}
              >
                <Ionicons name="barbell-outline" size={18} color="#fff" />
                <Text style={styles.completeButtonText}>Create Workout Plan</Text>
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



