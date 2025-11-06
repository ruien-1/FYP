import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import API from "../../api/backend";
import { auth } from "../../firebaseConfig";

export default function WorkoutPlanDetails() {
  const navigation = useNavigation();
  const route = useRoute();
  const { workoutPlanDetails } = route.params || {};
  const uid = auth.currentUser?.uid;
  const [loggingDayId, setLoggingDayId] = useState(null);

  const activities = workoutPlanDetails?.activities || [];

  const handleLogActivities = async (day) => {
    if (!uid) {
      Alert.alert("Not logged in", "Please login to log activities.");
      return;
    }

    try {
      setLoggingDayId(day.id);

      // Use the date from the day object, which is already in YYYY-MM-DD format
      // This ensures we log to the correct date that matches the day.label
      const dayDate = day.date || new Date().toISOString().split("T")[0];

      // Log activities from the selected activities array
      if (day.activities && day.activities.length > 0) {
        for (const activity of day.activities) {
          const activityLog = {
            name: activity.name,
            duration: activity.duration || 0,
            calories: activity.calories || 0,
            intensity: activity.intensity || "moderate",
            date: dayDate,
            activityId: activity.activityId || activity.id,
          };
          await API.post(`/activity_log/${uid}`, activityLog);
        }
      }

      // Also log manual activity if present
      if (day.activity && day.activity.trim() && day.calories) {
        // For manual entries, we'll create a simple activity log
        const manualActivityLog = {
          name: day.activity.trim(),
          duration: 0, // Manual entries might not have duration
          calories: Number(day.calories) || 0,
          intensity: "moderate",
          date: dayDate,
        };
        await API.post(`/activity_log/${uid}`, manualActivityLog);
      }

      Alert.alert(
        "Success",
        `Activities for ${day.label} have been logged to your diary!`,
        [{ text: "OK" }]
      );
    } catch (err) {
      console.error("Error logging activities:", err);
      Alert.alert("Error", "Failed to log activities. Please try again.");
    } finally {
      setLoggingDayId(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={26} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Workout Plan</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Plan Header */}
        <View style={styles.card}>
          <Text style={styles.planTitle}>
            {workoutPlanDetails?.title || "Workout Plan"}
          </Text>
          <Text style={styles.meta}>
            Duration: {workoutPlanDetails?.duration || "-"}
          </Text>
          {workoutPlanDetails?.description ? (
            <Text style={styles.description}>
              {workoutPlanDetails.description}
            </Text>
          ) : null}
          {workoutPlanDetails?.startDate && workoutPlanDetails?.endDate && (
            <Text style={styles.meta}>
              {formatDate(workoutPlanDetails.startDate)} -{" "}
              {formatDate(workoutPlanDetails.endDate)}
            </Text>
          )}
        </View>

        {/* Activities by Day */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Activities ({activities.length} days)
          </Text>
          {activities.map((day) => (
            <View key={day.id} style={styles.dayCard}>
              <View style={styles.dayHeader}>
                <View style={styles.dayHeaderLeft}>
                  <View style={styles.dayIcon}>
                    <Ionicons name="calendar-outline" size={20} color="#007AFF" />
                  </View>
                  <View style={{ flexShrink: 1 }}>
                    <Text style={styles.dayLabel}>{day.label}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[
                    styles.logActivityButton,
                    loggingDayId === day.id && styles.logActivityButtonDisabled,
                  ]}
                  onPress={() => handleLogActivities(day)}
                  disabled={loggingDayId === day.id}
                >
                  {loggingDayId === day.id ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="add-circle-outline" size={16} color="#fff" />
                      <Text style={styles.logActivityButtonText}>Log Activity</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Selected Activities */}
              {day.activities && day.activities.length > 0 && (
                <View style={styles.activitiesList}>
                  {day.activities.map((activity) => (
                    <View key={activity.id} style={styles.activityItem}>
                      <View style={styles.activityIcon}>
                        <Ionicons name="bicycle" size={18} color="#007AFF" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.activityName}>{activity.name}</Text>
                        <Text style={styles.activityMeta}>
                          {activity.duration} min • {activity.intensity} •{" "}
                          {activity.calories} cal
                          {activity.estimatedCalories &&
                            ` (Est: ${activity.estimatedCalories} cal)`}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Manual Activity Entry */}
              {day.activity && day.activity.trim() && (
                <View style={styles.manualActivity}>
                  <Text style={styles.manualActivityLabel}>Manual Entry:</Text>
                  <Text style={styles.manualActivityText}>{day.activity}</Text>
                  {day.calories && (
                    <Text style={styles.manualActivityCalories}>
                      {day.calories} calories
                    </Text>
                  )}
                </View>
              )}

              {/* Total Calories for Day */}
              {((day.activities && day.activities.length > 0) ||
                (day.calories && Number(day.calories) > 0)) && (
                <View style={styles.dayTotal}>
                  <Text style={styles.dayTotalText}>
                    Total:{" "}
                    {((day.activities || []).reduce(
                      (sum, a) => sum + (Number(a.calories) || 0),
                      0
                    ) +
                      (Number(day.calories) || 0)).toLocaleString()}{" "}
                    kcal
                  </Text>
                </View>
              )}

              {/* Empty State */}
              {(!day.activities || day.activities.length === 0) &&
                (!day.activity || !day.activity.trim()) && (
                  <Text style={styles.emptyDayText}>No activities for this day</Text>
                )}
            </View>
          ))}
        </View>

        {/* Summary */}
        {workoutPlanDetails?.caloriesTotal && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Summary</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryBox}>
                <Text style={styles.summaryValue}>
                  {workoutPlanDetails.caloriesTotal.toLocaleString()}
                </Text>
                <Text style={styles.summaryLabel}>Total Calories</Text>
              </View>
              <View style={styles.summaryBox}>
                <Text style={styles.summaryValue}>{activities.length}</Text>
                <Text style={styles.summaryLabel}>Days</Text>
              </View>
            </View>
          </View>
        )}

        {/* Notes */}
        {workoutPlanDetails?.notes && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Other Comments</Text>
            <Text style={styles.description}>{workoutPlanDetails.notes}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#E8F0FF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: { padding: 6 },
  title: { fontSize: 20, fontWeight: "700", color: "#000" },
  content: { padding: 16, paddingBottom: 120 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    elevation: 1,
  },
  planTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
    marginBottom: 6,
  },
  meta: { fontSize: 14, color: "#555", marginBottom: 4 },
  description: { fontSize: 14, color: "#333", marginTop: 6 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
    marginBottom: 12,
  },
  dayCard: {
    backgroundColor: "#FAFBFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#EEF2FF",
  },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  dayHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  dayIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F7FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  dayLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },
  dayDate: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  logActivityButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#007AFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  logActivityButtonDisabled: {
    opacity: 0.6,
  },
  logActivityButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  activitiesList: {
    marginBottom: 8,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F0F8FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  activityName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
  },
  activityMeta: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  manualActivity: {
    backgroundColor: "#FFF9E6",
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#FFE5B4",
  },
  manualActivityLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    marginBottom: 4,
  },
  manualActivityText: {
    fontSize: 13,
    color: "#000",
    marginBottom: 4,
  },
  manualActivityCalories: {
    fontSize: 12,
    color: "#007AFF",
    fontWeight: "600",
  },
  dayTotal: {
    backgroundColor: "#F0F8FF",
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    alignItems: "center",
  },
  dayTotalText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#007AFF",
  },
  emptyDayText: {
    fontSize: 13,
    color: "#999",
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 8,
  },
  summaryGrid: {
    flexDirection: "row",
    gap: 10,
  },
  summaryBox: {
    flex: 1,
    backgroundColor: "#F0F8FF",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D6EAFF",
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#007AFF",
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
});

