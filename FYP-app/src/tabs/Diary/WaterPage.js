import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Keyboard,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { SafeAreaView } from "react-native-safe-area-context"; // ✅ SafeAreaView
import { auth } from "../../firebaseConfig";
import API from "../../api/backend";

export default function WaterPage({ navigation, route }) {
  const { selectedDate } = route.params || {};
  const [waterAmount, setWaterAmount] = useState(1000);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const addWater = () => setWaterAmount(waterAmount + 250);
  const removeWater = () =>
    setWaterAmount(waterAmount - 250 >= 0 ? waterAmount - 250 : 0);

  const saveWater = async () => {
    try {
      setLoading(true);
      const uid = auth.currentUser?.uid;
      if (!uid) {
        setMessage({ text: "⚠️ You must be logged in to log water.", type: "error" });
        return;
      }

      const waterLog = {
        water: waterAmount,
        uid,
        date: selectedDate || new Date().toISOString().split("T")[0],
      };

      const postRes = await API.post(`/water_log/${uid}`, waterLog);

      if (postRes.data.success) {
        console.log("Water logged:", postRes.data.entry);
        setMessage({ text: "Water log saved!", type: "success" });
      } else {
        console.log("Water log failed:", postRes.data.message);
        setMessage({ text: "❌ Failed to log water. Please try again.", type: "error" });
      }
    } catch (error) {
      console.error("❌ Save water error:", error);
      setMessage({ text: "❌ Something went wrong while logging water.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // auto-hide messages after 3s
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.container}>
          {/* ✅ Message popup */}
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

          {/* Back button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={28} color="black" />
          </TouchableOpacity>

          {/* Centered content */}
          <View style={styles.centerContent}>
            <Ionicons name="water" size={120} color="#3FA9F5" style={styles.icon} />

            {/* Water Input */}
            <View style={styles.row}>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                returnKeyType="done"
                value={waterAmount.toString()}
                onChangeText={(text) => setWaterAmount(Number(text) || 0)}
              />
              <Text style={styles.unit}>ml</Text>
            </View>

            {/* Buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.circleButton} onPress={removeWater}>
                <Text style={styles.circleText}>-</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.circleButton} onPress={addWater}>
                <Text style={styles.circleText}>+</Text>
              </TouchableOpacity>
            </View>

            {/* Save button */}
            <TouchableOpacity
              style={[styles.saveButton, loading && { opacity: 0.6 }]}
              onPress={saveWater}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#E8F2FF" },

  container: { flex: 1, backgroundColor: "#E8F2FF" },

  backButton: {
    position: "absolute",
    top: 20,
    left: 20,
    zIndex: 10,
  },

  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  icon: { marginBottom: 20 },

  row: { flexDirection: "row", alignItems: "center" },

  input: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    width: 140,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  unit: { fontSize: 20, fontWeight: "600", color: "#333" },

  buttonRow: { flexDirection: "row", marginVertical: 30 },

  circleButton: {
    backgroundColor: "#4A90E2",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 15,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  circleText: { fontSize: 30, fontWeight: "600", color: "#fff" },

  saveButton: {
    backgroundColor: "#4A90E2",
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 20,
  },
  saveText: { color: "#fff", fontSize: 18, fontWeight: "600" },

  // ✅ Message styles
  messageBox: {
    position: "absolute",
    top: 10,
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
