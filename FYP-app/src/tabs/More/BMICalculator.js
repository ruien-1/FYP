import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function BMICalculator() {
  const navigation = useNavigation();

  const [sex, setSex] = useState("Male");
  const [weightUnit, setWeightUnit] = useState("kg");
  const [heightUnit, setHeightUnit] = useState("cm");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [bmi, setBmi] = useState(null);
  const [category, setCategory] = useState("");

  const calculateBMI = () => {
    if (!weight || !height) return;

    let w = parseFloat(weight);
    let h = parseFloat(height);

    // Convert weight to kg
    if (weightUnit === "lbs") {
      w = w * 0.453592;
    }

    // Convert height to meters
    if (heightUnit === "cm") {
      h = h / 100;
    } else if (heightUnit === "feet") {
      h = h * 0.3048;
    }

    if (h <= 0) return;

    const result = w / (h * h);
    setBmi(result.toFixed(1));

    if (result < 18.5) setCategory("Underweight");
    else if (result >= 18.5 && result < 24.9) setCategory("Normal weight");
    else if (result >= 25 && result < 29.9) setCategory("Overweight");
    else setCategory("Obesity");
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={26} color="#333" />
        </TouchableOpacity>
        <Text style={styles.header}>BMI Calculator</Text>

        <View style={{ width: 26 }} />
        </View>

        {/* Biological Sex */}
        <Text style={styles.label}>Biological Sex</Text>
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.toggleButton, sex === "Male" && styles.activeButton]}
            onPress={() => setSex("Male")}
          >
            <Text style={styles.toggleText}>Male</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, sex === "Female" && styles.activeButton]}
            onPress={() => setSex("Female")}
          >
            <Text style={styles.toggleText}>Female</Text>
          </TouchableOpacity>
        </View>

        {/* Weight Input */}
        <Text style={styles.label}>Weight</Text>
        <View style={styles.row}>
          <TextInput
            style={styles.input}
            placeholder="Enter weight"
            keyboardType="numeric"
            returnKeyType="done"
            keyboardAppearance="light" 
            value={weight}
            onChangeText={setWeight}
          />
          <TouchableOpacity
            style={[styles.unitButton, weightUnit === "kg" && styles.activeButton]}
            onPress={() => setWeightUnit("kg")}
          >
            <Text style={styles.toggleText}>kg</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.unitButton, weightUnit === "lbs" && styles.activeButton]}
            onPress={() => setWeightUnit("lbs")}
          >
            <Text style={styles.toggleText}>lbs</Text>
          </TouchableOpacity>
        </View>

        {/* Height Input */}
        <Text style={styles.label}>Height</Text>
        <View style={styles.row}>
          <TextInput
            style={styles.input}
            placeholder="Enter height"
            keyboardType="numeric"
            returnKeyType="done"
            keyboardAppearance="light" 
            value={height}
            onChangeText={setHeight}
          />
          <TouchableOpacity
            style={[styles.unitButton, heightUnit === "cm" && styles.activeButton]}
            onPress={() => setHeightUnit("cm")}
          >
            <Text style={styles.toggleText}>cm</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.unitButton, heightUnit === "feet" && styles.activeButton]}
            onPress={() => setHeightUnit("feet")}
          >
            <Text style={styles.toggleText}>feet</Text>
          </TouchableOpacity>
        </View>

        {/* Calculate Button */}
        <TouchableOpacity style={styles.calculateButton} onPress={calculateBMI}>
          <Text style={styles.calculateText}>Calculate</Text>
        </TouchableOpacity>

        {/* BMI Result */}
        {bmi && (
          <View style={styles.resultBox}>
            <Text style={styles.resultText}>Your BMI: {bmi}</Text>
            <Text style={styles.categoryText}>{category}</Text>
          </View>
        )}
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E9F0FA",
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  backButton: {
    marginBottom: 10,
    alignSelf: "flex-start",
  },
headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 30,
    },
header: {
    fontSize: 25,
    fontWeight: "bold",
    marginLeft: 10,
    color: "#333",
    },

  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 12,
    color: "#222",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  toggleButton: {
    flex: 1,
    backgroundColor: "#cfd9eb",
    padding: 12,
    borderRadius: 8,
    marginRight: 10,
    alignItems: "center",
  },
  unitButton: {
    backgroundColor: "#cfd9eb",
    padding: 12,
    borderRadius: 8,
    marginLeft: 8,
    width: 65,
    alignItems: "center",
  },
  activeButton: {
    backgroundColor: "#a9c4f5",
  },
  toggleText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#333",
  },
  input: {
    flex: 1,
    backgroundColor: "#fff",
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
  },
  calculateButton: {
    backgroundColor: "#3366cc",
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    alignItems: "center",
  },
  calculateText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  resultBox: {
    marginTop: 25,
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  resultText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#222",
  },
  categoryText: {
    fontSize: 15,
    fontWeight: "500",
    marginTop: 5,
    color: "#555",
  },
});
