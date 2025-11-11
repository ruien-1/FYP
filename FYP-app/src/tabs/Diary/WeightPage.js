import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth } from "../../firebaseConfig";
import API from "../../api/backend";

export default function WeightPage({ route, navigation }) {
  const { selectedDate } = route.params;
  const [weight, setWeight] = useState("");

  const handleSave = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid || !weight) {
      Alert.alert("Error", "Please enter your weight.");
      return;
    }

    try {
      await API.post(`/daily_summary/${uid}`, {
        date: selectedDate,
        weight: parseFloat(weight),
      });
      Alert.alert("Success", "Weight logged successfully!");
      navigation.goBack();
    } catch (err) {
      Alert.alert("Error", "Failed to log weight.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Log Your Weight</Text>
      <Text style={styles.dateText}>{selectedDate}</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter weight (kg)"
        keyboardType="numeric"
        value={weight}
        onChangeText={setWeight}
      />

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveText}>Save</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    backgroundColor: "#E8F0FF",

  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },
  dateText: {
    textAlign: "center",
    color: "#666",
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 12,
    fontSize: 18,
    marginBottom: 20,
  },
  saveButton: {
    backgroundColor: "#4A90E2",
    padding: 15,
    borderRadius: 10,
  },
  saveText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 18,
    fontWeight: "bold",
  },
});
