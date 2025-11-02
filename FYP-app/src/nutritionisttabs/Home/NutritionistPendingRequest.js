// NutritionistPendingRequest.js - Updated with Chat Messages and Read Status
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

export default function NutritionistPendingRequest() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [appointmentCount, setAppointmentCount] = useState(0);
  const [rescheduleCount, setRescheduleCount] = useState(0);
  const [mealPlanCount, setMealPlanCount] = useState(0);
  const [selectedType, setSelectedType] = useState("appointment");
  const currentUser = auth.currentUser;

  useEffect(() => {
    fetchAllCounts();
    fetchRequests();
  }, [selectedType]);

  // Fetch all counts on initial load
  const fetchAllCounts = async () => {
    try {
      const [appointmentResponse, mealPlanResponse] = await Promise.all([
        API.get("/appointments/nutritionist", {
          params: { nutritionistId: currentUser.uid, status: "pending" },
        }),
        API.get("/meal-plans/nutritionist", {
          params: { nutritionistId: currentUser.uid, status: "pending" },
        }),
      ]);

      const appointmentData = appointmentResponse.data?.data || [];
      const mealPlanData = mealPlanResponse.data?.data || [];

      // Separate appointment and reschedule counts
      const appointmentOnlyData = appointmentData.filter((a) => !a.isRescheduled);
      const rescheduleData = appointmentData.filter((a) => a.isRescheduled);

      setAppointmentCount(appointmentOnlyData.length);
      setRescheduleCount(rescheduleData.length);
      setMealPlanCount(mealPlanData.length);
    } catch (error) {
      console.error("Error fetching counts:", error);
    }
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);

      if (selectedType === "mealplan") {
        // Fetch meal plan requests
        const mealPlanResponse = await API.get("/meal-plans/nutritionist", {
          params: { nutritionistId: currentUser.uid, status: "pending" },
        });
        const mealPlanData = mealPlanResponse.data?.data || [];
        setRequests(mealPlanData);
      } else {
        // Fetch appointment requests
        const response = await API.get("/appointments/nutritionist", {
          params: { nutritionistId: currentUser.uid, status: "pending" },
        });

        const allData = response.data?.data || [];

        // Separate appointment and reschedule counts
        const appointmentData = allData.filter((a) => !a.isRescheduled);
        const rescheduleData = allData.filter((a) => a.isRescheduled);

        setRequests(
          selectedType === "appointment" ? appointmentData : rescheduleData
        );
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const sendChatMessage = async (appointment, messageText, isAccepted) => {
    try {
      const userId = appointment.userId;
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
        appointmentId: appointment.id,
        isAppointmentResponse: true,
        isAccepted: isAccepted,
        read: false, // ✅ Mark as unread initially
      });

      console.log('✅ Chat message sent successfully');
    } catch (error) {
      console.error('❌ Error sending chat message:', error);
    }
  };

  const handleApprove = async (request) => {
    try {
      if (selectedType === "mealplan") {
        // Handle meal plan approval
        await API.put(`/meal-plans/nutritionist/${request.id}`, { 
          status: "confirmed",
          isAccepted: true,
          isRejected: false
        });

        const message = `✅ Meal Plan Request Approved\n\nYour ${request.duration} meal plan request has been approved!\n\nI'll start working on your personalized meal plan and will share it with you soon.`;

        await sendChatMessage(request, message, true);
        Alert.alert("✅ Success", "Meal plan request approved successfully!");
      } else {
        // Handle appointment approval
        await API.put(`/appointments/nutritionist/${request.id}`, { 
          status: "confirmed",
          isAccepted: true,
          isRejected: false
        });

        // Format date and time
        const appointmentDate = new Date(request.appointmentDate);
        const dateStr = appointmentDate.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        });
        const timeStr = appointmentDate.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        });

        // Create appropriate message
        let message;
        if (request.isRescheduled) {
          const oldDate = new Date(request.oldAppointmentDate);
          const oldDateStr = oldDate.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
          });
          const oldTimeStr = oldDate.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          });

          message = `✅ Reschedule Confirmed\n\nYour reschedule request has been approved!\n\nOld Time: ${oldDateStr} at ${oldTimeStr}\nNew Time: ${dateStr} at ${timeStr}\n\nSee you then!`;
        } else {
          message = `✅ Appointment Confirmed\n\nYour appointment has been confirmed!\n\nDate: ${dateStr}\nTime: ${timeStr}\n\nLooking forward to our session!`;
        }

        await sendChatMessage(request, message, true);
        Alert.alert("✅ Success", request.isRescheduled ? "Reschedule approved successfully!" : "Appointment approved successfully!");
      }

      fetchRequests();
    } catch (error) {
      console.error("Error approving request:", error);
      Alert.alert("Error", "Failed to approve request.");
    }
  };

  const handleReject = async (request) => {
    try {
      if (selectedType === "mealplan") {
        // Handle meal plan rejection
        await API.put(`/meal-plans/nutritionist/${request.id}`, { 
          status: "rejected",
          isRejected: true,
          isAccepted: false
        });

        const message = `❌ Meal Plan Request Declined\n\nUnfortunately, I'm unable to fulfill your ${request.duration} meal plan request at this time.\n\nPlease feel free to request a different duration or contact me for other nutrition services.`;

        await sendChatMessage(request, message, false);
        Alert.alert("❌ Rejected", "Meal plan request declined.");
      } else {
        // Handle appointment rejection
        await API.put(`/appointments/nutritionist/${request.id}`, { 
          status: "rejected",
          isRejected: true,
          isAccepted: false,
          isRescheduleRejected: request.isRescheduled ? true : false
        });

        // Format date and time
        const appointmentDate = new Date(request.appointmentDate);
        const dateStr = appointmentDate.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        });
        const timeStr = appointmentDate.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        });

        // Create appropriate message
        let message;
        if (request.isRescheduled) {
          message = `❌ Reschedule Request Declined\n\nUnfortunately, I'm not available at the requested time:\n${dateStr} at ${timeStr}\n\nPlease select a different time that works for you.`;
        } else {
          message = `❌ Appointment Request Declined\n\nUnfortunately, I'm not available at the requested time:\n${dateStr} at ${timeStr}\n\nPlease choose another time slot.`;
        }

        await sendChatMessage(request, message, false);
        Alert.alert("❌ Rejected", request.isRescheduled ? "Reschedule request declined." : "Appointment request declined.");
      }

      fetchRequests();
    } catch (error) {
      console.error("Error rejecting request:", error);
      Alert.alert("Error", "Failed to reject request.");
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

  const formatTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
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
        <Text style={styles.headerTitle}>Pending Request</Text>
      </View>

      {/* Tabs with Counters */}
      <View style={styles.tabContainer}>
        {/* Appointment Tab */}
        <TouchableOpacity
          style={[
            styles.tab,
            selectedType === "appointment" && styles.activeTab,
          ]}
          onPress={() => setSelectedType("appointment")}
        >
          <Text
            style={[
              styles.tabText,
              selectedType === "appointment" && styles.activeTabText,
            ]}
          >
            Appointment
          </Text>
          <View
            style={[
              styles.badge,
              selectedType === "appointment" && styles.activeBadge,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                selectedType === "appointment" && styles.activeBadgeText,
              ]}
            >
              {appointmentCount}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Reschedule Tab */}
        <TouchableOpacity
          style={[styles.tab, selectedType === "reschedule" && styles.activeTab]}
          onPress={() => setSelectedType("reschedule")}
        >
          <Text
            style={[
              styles.tabText,
              selectedType === "reschedule" && styles.activeTabText,
            ]}
          >
            Reschedule
          </Text>
          <View
            style={[
              styles.badge,
              selectedType === "reschedule" && styles.activeBadge,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                selectedType === "reschedule" && styles.activeBadgeText,
              ]}
            >
              {rescheduleCount}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Meal Plan Tab */}
        <TouchableOpacity
          style={[styles.tab, selectedType === "mealplan" && styles.activeTab]}
          onPress={() => setSelectedType("mealplan")}
        >
          <Text
            style={[
              styles.tabText,
              selectedType === "mealplan" && styles.activeTabText,
            ]}
          >
            Meal Plan
          </Text>
          <View
            style={[
              styles.badge,
              selectedType === "mealplan" && styles.activeBadge,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                selectedType === "mealplan" && styles.activeBadgeText,
              ]}
            >
              {mealPlanCount}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Requests */}
      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 30 }} />
      ) : requests.length === 0 ? (
        <Text style={styles.emptyText}>
          No pending {selectedType} requests.
        </Text>
      ) : (
        requests.map((req) => (
          <View key={req.id} style={styles.card}>
            <View style={styles.row}>
              <Ionicons 
                name={selectedType === "mealplan" ? "restaurant-outline" : "person-circle-outline"} 
                size={26} 
                color="#007AFF" 
              />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.name}>{req.userName}</Text>
                {selectedType === "mealplan" ? (
                  <Text style={styles.date}>
                    🥗 {req.duration} meal plan request
                  </Text>
                ) : (
                  <>
                    <Text style={styles.date}>
                      {formatDate(req.appointmentDate)} at{" "}
                      {formatTime(req.appointmentDate)}
                    </Text>
                    {req.isRescheduled && req.oldAppointmentDate && (
                      <Text style={styles.rescheduleNote}>
                        🔁 Rescheduled from {formatTime(req.oldAppointmentDate)} on{" "}
                        {formatDate(req.oldAppointmentDate)}
                      </Text>
                    )}
                  </>
                )}
              </View>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.rejectButton]}
                onPress={() => handleReject(req)}
              >
                <Ionicons name="close" size={18} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.approveButton]}
                onPress={() => handleApprove(req)}
              >
                <Ionicons name="checkmark" size={18} color="#fff" />
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
  tabContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#CFE3FF",
    borderRadius: 16,
    paddingVertical: 10,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    flexDirection: "row",
    justifyContent: "center",
    marginHorizontal: 6,
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: "#007AFF",
  },
  tabText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginRight: 6,
  },
  activeTabText: {
    color: "#fff",
  },
  badge: {
    backgroundColor: "#fff",
    borderRadius: 10,
    minWidth: 22,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  activeBadge: {
    backgroundColor: "#fff",
  },
  badgeText: {
    color: "#007AFF",
    fontWeight: "700",
    fontSize: 13,
  },
  activeBadgeText: {
    color: "#007AFF",
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
  date: {
    fontSize: 14,
    color: "#555",
  },
  rescheduleNote: {
    fontSize: 13,
    color: "#007AFF",
    marginTop: 4,
    fontStyle: "italic",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginLeft: 10,
  },
  approveButton: {
    backgroundColor: "#34C759",
  },
  rejectButton: {
    backgroundColor: "#FF3B30",
  },
});