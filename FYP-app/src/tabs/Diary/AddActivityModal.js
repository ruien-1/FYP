import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Keyboard,
  Modal,
  Platform,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import API from "../../api/backend";
import { auth } from "../../firebaseConfig";

export default function AddActivityModal({
  visible,
  onClose,
  selectedActivity,
  selectedDate,
}) {
  const [duration, setDuration] = useState("");
  const [calories, setCalories] = useState("");
  const [estimatedCalories, setEstimatedCalories] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [userInfo, setUserInfo] = useState(null);
  const [intensity, setIntensity] = useState("moderate");

  useEffect(() => {
    if (visible) {
      setDuration("");
      setCalories("");
      setEstimatedCalories(null);
      setSuccessMessage("");
      setErrorMessage("");
      setIntensity("moderate");
    }
  }, [visible, selectedActivity, selectedDate]);

  useEffect(() => {
    if (visible && auth.currentUser?.uid) {
      fetchUserInfo(auth.currentUser.uid);
    }
  }, [visible]);

  useEffect(() => {
    calculateEstimatedCalories();
  }, [duration, intensity, userInfo, selectedActivity]);

  const fetchUserInfo = async (uid) => {
    try {
      const res = await API.get(`/user_info/${uid}`);
      setUserInfo(res.data);
    } catch (err) {
    }
  };

  const showSuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(""), 2000);
  };

  const showError = (msg) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(""), 2000);
  };

  const calculateEstimatedCalories = () => {
    if (!userInfo || !duration || !selectedActivity?.met) {
      setEstimatedCalories(null);
      return;
    }

    const dur = parseFloat(duration);
    if (isNaN(dur)) {
      setEstimatedCalories(null);
      return;
    }

    let intensityMultiplier = 1;
    switch (intensity) {
      case "light":
        intensityMultiplier = 0.8;
        break;
      case "moderate":
        intensityMultiplier = 1;
        break;
      case "vigorous":
        intensityMultiplier = 1.2;
        break;
    }

    const { weight, height, age, gender } = userInfo;
    const bmr =
      gender.toLowerCase() === "male"
        ? 10 * weight + 6.25 * height - 5 * age + 5
        : 10 * weight + 6.25 * height - 5 * age - 161;

    const bmrPerHour = bmr / 24;
    const calBurned =
      bmrPerHour *
      selectedActivity.met *
      intensityMultiplier *
      (dur / 60);

    setEstimatedCalories(Math.round(calBurned));
  };

const handleLogActivity = async () => {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not logged in");

    if (!duration || !calories) {
      showError("Please fill in both duration and calories.");
      return;
    }

    const finalDate =
      typeof selectedDate === "string"
        ? selectedDate
        : selectedDate?.toLocaleDateString("en-CA");



    const activityLog = {
      name: selectedActivity?.name,
      duration: Number(duration),
      calories: Number(calories),
      intensity,
      date: finalDate,
      activityId: selectedActivity?.id,
    };

    const res = await API.post(`/activity_log/${uid}`, activityLog);
    if (res.data.success) {
      showSuccess(`"${selectedActivity?.name}" logged successfully!`);
      setDuration("");
      setCalories("");
      setEstimatedCalories(null);
    }
  } catch (err) {
    showError("Failed to log activity.");
  }
};


  if (!visible) return null;

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <Ionicons name="close" size={24} color="black" />
              </TouchableOpacity>

              {successMessage && <Text style={styles.successMsg}>{successMessage}</Text>}
              {errorMessage && <Text style={styles.errorMsg}>{errorMessage}</Text>}

              <Text style={styles.modalTitle}>
                {selectedActivity?.name || "Activity"}
              </Text>

              <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
                <Text style={styles.label}>Time (Minutes)</Text>
                <TextInput
                  style={styles.input}
                  value={duration}
                  onChangeText={setDuration}
                  keyboardType="numeric"
                />

                <Text style={styles.label}>Intensity</Text>
                <View style={styles.intensityContainer}>
                  {["light", "moderate", "vigorous"].map((level) => (
                    <TouchableOpacity
                      key={level}
                      style={[
                        styles.intensityButton,
                        intensity === level && styles.intensitySelected,
                      ]}
                      onPress={() => setIntensity(level)}
                    >
                      <Text
                        style={{
                          color: intensity === level ? "#fff" : "#333",
                          fontWeight: "600",
                        }}
                      >
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>Calories (Cal)</Text>
                <TextInput
                  style={styles.input}
                  value={calories}
                  onChangeText={setCalories}
                  keyboardType="numeric"
                />

                {estimatedCalories !== null && (
                  <Text
                    style={{ marginTop: 8, color: "#555", fontStyle: "italic" }}
                  >
                    Estimated Calories: {estimatedCalories} kcal
                  </Text>
                )}
              </ScrollView>

              <TouchableOpacity style={styles.logBtn} onPress={handleLogActivity}>
                <Text style={{ fontWeight: "600" }}>Log Activity</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContainer: {
    height: "70%",
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    justifyContent: "space-between",
  },
  closeBtn: { alignSelf: "flex-end" },
  modalTitle: { fontSize: 30, fontWeight: "700", marginBottom: 20 },
  label: { fontSize: 14, fontWeight: "500", marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
  },
  intensityContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  intensityButton: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: "#4A90E2",
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: "center",
  },
  intensitySelected: {
    backgroundColor: "#4A90E2",
  },
  logBtn: {
    backgroundColor: "#E8F2FF",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  successMsg: {
    backgroundColor: "#d4edda",
    color: "#155724",
    padding: 8,
    borderRadius: 6,
    textAlign: "center",
    marginBottom: 10,
    fontWeight: "600",
  },
  errorMsg: {
    backgroundColor: "#f8d7da",
    color: "#721c24",
    padding: 8,
    borderRadius: 6,
    marginBottom: 10,
    textAlign: "center",
    fontWeight: "600",
  },
});
