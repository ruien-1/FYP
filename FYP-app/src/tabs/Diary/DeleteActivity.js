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

export default function DeleteActivity() {
  const navigation = useNavigation();
  const route = useRoute();

  const { uid, selectedDate } = route.params || {};
  const [activitiesList, setActivitiesList] = useState([]);
  const [selectedActivities, setSelectedActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const toggleActivitySelection = (id) => {
    setSelectedActivities((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/activity_log/${uid}?date=${selectedDate}`);
      const entries = Array.isArray(res.data) ? res.data : [];
      setActivitiesList(entries);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching activities:", err);
      setMessage({ text: "❌ Could not fetch activities.", type: "error" });
      setLoading(false);
    }
  };

  useEffect(() => {
    if (uid && selectedDate) fetchActivities();
  }, [uid, selectedDate]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const deleteSingleActivity = async (entryId) => {
    try {
      await API.delete(`/activity_log/${uid}/${entryId}`);
      setMessage({ text: "✅ Activity has been deleted.", type: "success" });
      fetchActivities();
    } catch (err) {
      console.error("Error deleting activity:", err);
      setMessage({ text: "❌ Could not delete activity.", type: "error" });
    }
  };

  const deleteSelectedActivities = async () => {
    if (!selectedActivities.length) {
      setMessage({
        text: "⚠️ Please select at least one activity to delete.",
        type: "error",
      });
      return;
    }

    try {
      for (const entryId of selectedActivities) {
        await API.delete(`/activity_log/${uid}/${entryId}`);
      }
      setMessage({
        text: "✅ Selected activities have been deleted.",
        type: "success",
      });
      setSelectedActivities([]);
      fetchActivities();
    } catch (err) {
      console.error("Error deleting activities:", err);
      setMessage({ text: "❌ Could not delete activities.", type: "error" });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator size="large" color="#4A90E2" style={{ marginTop: 50 }} />
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
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#333" />
        </TouchableOpacity>

        <Text style={styles.title}>Select activities to delete</Text>

        {activitiesList.length === 0 ? (
          <Text style={styles.emptyText}>No activities found for this date.</Text>
        ) : (
          <View style={styles.activityList}>
            {activitiesList.map((activity) => {
              const isSelected = selectedActivities.includes(activity.id);
              return (
                <View key={activity.id} style={styles.activityItem}>
                  <TouchableOpacity
                    style={[
                      styles.checkbox,
                      { backgroundColor: isSelected ? "#4A90E2" : "#fff" },
                    ]}
                    onPress={() => toggleActivitySelection(activity.id)}
                  >
                    {isSelected && <Ionicons name="checkmark" size={18} color="#fff" />}
                  </TouchableOpacity>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.activityName}>{activity.name}</Text>
                    <Text style={styles.activityInfo}>
                      {activity.duration} min | {activity.calories} kcal
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => deleteSingleActivity(activity.id)}
                  >
                    <Ionicons name="trash" size={18} color="#333" />
                    <Text style={styles.deleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {activitiesList.length > 0 && (
          <TouchableOpacity
            style={styles.deleteActivitiesBtn}
            onPress={deleteSelectedActivities}
          >
            <Text style={styles.deleteActivitiesText}>Delete</Text>
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
  activityList: { marginBottom: 30 },
  activityItem: {
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
  activityName: { fontSize: 15, fontWeight: "500", color: "#333" },
  activityInfo: { fontSize: 13, color: "#777" },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F7FB",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  deleteText: { fontSize: 13, color: "#333", marginLeft: 4 },
  deleteActivitiesBtn: {
    backgroundColor: "#4A90E2",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  deleteActivitiesText: { color: "#fff", fontSize: 16, fontWeight: "600" },

  // ✅ Message banner
  messageBox: {
    position: "absolute",
    top: 50,
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
