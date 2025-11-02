import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

export default function CreateWorkoutPlan() {
  const navigation = useNavigation();
  const route = useRoute();
  const { workoutPlan } = route.params || {};

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Workout Plan</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Coming Soon</Text>
        <Text style={styles.description}>
          This screen will let you create and share a personalized workout plan with your client.
        </Text>
        {workoutPlan && (
          <View style={styles.detailsBox}>
            <Text style={styles.detailsTitle}>Request Details</Text>
            <Text style={styles.detail}>Client: {workoutPlan.userName || "-"}</Text>
            <Text style={styles.detail}>Requested: {new Date(workoutPlan.createdAt || Date.now()).toLocaleDateString()}</Text>
            {workoutPlan.requestMessage ? (
              <Text style={styles.detail}>Message: {workoutPlan.requestMessage}</Text>
            ) : null}
          </View>
        )}
      </View>
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
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: "#555",
    marginBottom: 12,
  },
  detailsBox: {
    backgroundColor: "#F6FAFF",
    borderRadius: 10,
    padding: 12,
    borderColor: "#D6E6FF",
    borderWidth: 1,
    marginTop: 8,
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#007AFF",
    marginBottom: 6,
  },
  detail: {
    fontSize: 13,
    color: "#333",
    marginBottom: 2,
  },
});


