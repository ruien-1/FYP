import React, { useState } from "react";
import { View, Text, Modal, TouchableOpacity, TextInput, StyleSheet } from "react-native";

export default function LogMealModal({ visible, onClose, onLog, recipe }) {
  const [mealType, setMealType] = useState("breakfast");
  const [servings, setServings] = useState("1");

  if (!recipe) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.box}>

          {/* Meal Type */}
          <Text>Meal Type:</Text>
          <View style={styles.row}>
            {["breakfast", "lunch", "dinner", "snack"].map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.tag, mealType === type && styles.selectedTag]}
                onPress={() => setMealType(type)}
              >
                <Text style={{ color: mealType === type ? "#fff" : "#000" }}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Servings */}
          <Text>Servings:</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={servings}
            onChangeText={setServings}
          />

          {/* Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.cancel}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                onLog(recipe, mealType, Number(servings));
                onClose();
              }}
            >
              <Text style={styles.log}>Log</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  box: { width: "80%", backgroundColor: "#fff", borderRadius: 16, padding: 16 },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 12 },
  row: { flexDirection: "row", marginVertical: 8, flexWrap: "wrap" },
  tag: { padding: 8, marginRight: 8, borderRadius: 12, backgroundColor: "#f2f2f2", marginBottom: 4 },
  selectedTag: { backgroundColor: "#007AFF" },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 6, width: 80, marginBottom: 16 },
  buttonRow: { flexDirection: "row", justifyContent: "flex-end" },
  cancel: { color: "red", fontWeight: "600", marginRight: 12 },
  log: { color: "#007AFF", fontWeight: "600" },
});
