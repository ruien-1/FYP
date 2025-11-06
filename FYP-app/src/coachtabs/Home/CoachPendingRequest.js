// CoachPendingRequest.js - Updated with Chat Messages, Read Status, and Workout Plan tab
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

export default function PendingRequest() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [appointmentCount, setAppointmentCount] = useState(0);
  const [rescheduleCount, setRescheduleCount] = useState(0);
  const [workoutPlanCount, setWorkoutPlanCount] = useState(0);
  const [selectedType, setSelectedType] = useState("appointment");
  const currentUser = auth.currentUser;

  useEffect(() => {
    fetchAllCounts();
    fetchRequests();
  }, [selectedType]);

  // Fetch all counts on initial load or when tab changes
  const fetchAllCounts = async () => {
    try {
      const [appointmentResponse, workoutPlanResponse] = await Promise.all([
        API.get("/appointments/coach", {
          params: { coachId: currentUser.uid, status: "pending" },
        }),
        API.get("/workout-plans/coach", {
          params: { coachId: currentUser.uid, status: "pending" },
        }).catch((err) => {
          console.error("Error fetching workout plan counts:", err);
          return { data: { data: [] } };
        }),
      ]);

      const appointmentData = appointmentResponse.data?.data || [];
      const workoutPlanData = workoutPlanResponse.data?.data || [];

      const appointmentOnlyData = appointmentData.filter((a) => !a.isRescheduled);
      const rescheduleData = appointmentData.filter((a) => a.isRescheduled);

      setAppointmentCount(appointmentOnlyData.length);
      setRescheduleCount(rescheduleData.length);
      setWorkoutPlanCount(workoutPlanData.length);
    } catch (error) {
      console.error("Error fetching counts:", error);
    }
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      if (selectedType === "workout") {
        const workoutPlanResponse = await API.get("/workout-plans/coach", {
          params: { coachId: currentUser.uid, status: "pending" },
        }).catch((err) => {
          console.error("Error fetching workout plans:", err);
          return { data: { data: [] } };
        });
        const workoutPlanData = workoutPlanResponse.data?.data || [];
        setRequests(workoutPlanData);
      } else {
        const response = await API.get("/appointments/coach", {
          params: { coachId: currentUser.uid, status: "pending" },
        });

        const allData = response.data?.data || [];

        const appointmentData = allData.filter((a) => !a.isRescheduled);
        const rescheduleData = allData.filter((a) => a.isRescheduled);

        setAppointmentCount(appointmentData.length);
        setRescheduleCount(rescheduleData.length);

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

  const sendChatMessage = async (request, messageText, isAccepted, options = {}) => {
    try {
      const userId = request.userId;
      const chatId = currentUser.uid > userId
        ? `${currentUser.uid}_${userId}`
        : `${userId}_${currentUser.uid}`;

      const payload = {
        _id: Math.random().toString(36).substring(7),
        text: messageText,
        createdAt: serverTimestamp(),
        user: {
          _id: currentUser.uid,
          name: currentUser.displayName || "Coach",
        },
        isAccepted: isAccepted,
        read: false,
      };
      if (options.appointmentId) payload.appointmentId = options.appointmentId;
      if (options.isAppointmentResponse !== undefined) payload.isAppointmentResponse = options.isAppointmentResponse;
      if (options.workoutPlanId) payload.workoutPlanId = options.workoutPlanId;
      if (options.isWorkoutPlanResponse !== undefined) payload.isWorkoutPlanResponse = options.isWorkoutPlanResponse;

      await addDoc(collection(db, "chats", chatId, "messages"), payload);

      console.log('✅ Chat message sent successfully');
    } catch (error) {
      console.error('❌ Error sending chat message:', error);
    }
  };

  const handleApprove = async (appointment) => {
    try {
      if (selectedType === "workout") {
        await API.put(`/workout-plans/coach/${appointment.id}`, {
          status: "confirmed",
          isAccepted: true,
          isRejected: false,
        }).catch(() => {});

        const message = `✅ Workout Plan Request Approved\n\nYour workout plan request has been approved!\n\nI'll start preparing your personalized workout plan and will share it with you soon.`;

        await sendChatMessage(appointment, message, true, {
          workoutPlanId: appointment.id,
          isWorkoutPlanResponse: true,
        });

        Alert.alert("✅ Success", "Workout plan request approved successfully!");
        fetchRequests();
        return;
      }

      // Update appointment status
      await API.put(`/appointments/coach/${appointment.id}`, { 
        status: "confirmed",
        isAccepted: true,
        isRejected: false
      });

      // Format date and time
      const appointmentDate = new Date(appointment.appointmentDate);
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
      if (appointment.isRescheduled) {
        const oldDate = new Date(appointment.oldAppointmentDate);
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

      // Send message to chat
      await sendChatMessage(appointment, message, true, {
        appointmentId: appointment.id,
        isAppointmentResponse: true,
      });

      Alert.alert("✅ Success", appointment.isRescheduled ? "Reschedule approved successfully!" : "Appointment approved successfully!");
      fetchRequests();
    } catch (error) {
      console.error("Error approving request:", error);
      Alert.alert("Error", "Failed to approve request.");
    }
  };

  const handleReject = async (appointment) => {
    try {
      if (selectedType === "workout") {
        await API.put(`/workout-plans/coach/${appointment.id}`, {
          status: "rejected",
          isRejected: true,
          isAccepted: false,
        }).catch(() => {});

        const message = `❌ Workout Plan Request Declined\n\nUnfortunately, I'm unable to fulfill your workout plan request at this time.\n\nPlease feel free to request again later or contact me for other coaching services.`;

        await sendChatMessage(appointment, message, false, {
          workoutPlanId: appointment.id,
          isWorkoutPlanResponse: true,
        });

        Alert.alert("❌ Rejected", "Workout plan request declined.");
        fetchRequests();
        return;
      }

      // Update appointment status
      await API.put(`/appointments/coach/${appointment.id}`, { 
        status: "rejected",
        isRejected: true,
        isAccepted: false,
        isRescheduleRejected: appointment.isRescheduled ? true : false
      });

      // Format date and time
      const appointmentDate = new Date(appointment.appointmentDate);
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
      if (appointment.isRescheduled) {
        message = `❌ Reschedule Request Declined\n\nUnfortunately, I'm not available at the requested time:\n${dateStr} at ${timeStr}\n\nPlease select a different time that works for you.`;
      } else {
        message = `❌ Appointment Request Declined\n\nUnfortunately, I'm not available at the requested time:\n${dateStr} at ${timeStr}\n\nPlease choose another time slot.`;
      }

      // Send message to chat
      await sendChatMessage(appointment, message, false, {
        appointmentId: appointment.id,
        isAppointmentResponse: true,
      });

      Alert.alert("❌ Rejected", appointment.isRescheduled ? "Reschedule request declined." : "Appointment request declined.");
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

      {/* Tabs with Counters */
      }
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

        {/* Workout Plan Tab */}
        <TouchableOpacity
          style={[styles.tab, selectedType === "workout" && styles.activeTab]}
          onPress={() => setSelectedType("workout")}
        >
          <Text
            style={[
              styles.tabText,
              selectedType === "workout" && styles.activeTabText,
            ]}
          >
            Workout Plan
          </Text>
          <View
            style={[
              styles.badge,
              selectedType === "workout" && styles.activeBadge,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                selectedType === "workout" && styles.activeBadgeText,
              ]}
            >
              {workoutPlanCount}
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
              <Ionicons name={selectedType === "workout" ? "barbell-outline" : "person-circle-outline"} size={26} color="#007AFF" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.name}>{req.userName}</Text>
                {selectedType === "workout" ? (
                  <Text style={styles.date}>💪 Workout plan request</Text>
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
    paddingHorizontal: 8,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    flexDirection: "row",
    justifyContent: "center",
    marginHorizontal: 3,
    borderRadius: 12,
    paddingHorizontal: 6,
  },
  activeTab: {
    backgroundColor: "#007AFF",
  },
  tabText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
    marginRight: 5,
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



