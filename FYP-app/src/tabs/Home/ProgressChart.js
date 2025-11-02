import React, { useEffect, useState } from "react";
import { View, Text, Dimensions, ActivityIndicator, StyleSheet, ScrollView } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { auth } from "../firebase";
import API from "../api";

const screenWidth = Dimensions.get("window").width;

export default function ProgressChart() {
  const [weightData, setWeightData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWeightProgress();
  }, []);

  const fetchWeightProgress = async () => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const res = await API.get(`/weight_progress/${uid}`);
      setWeightData(res.data || []);
    } catch (err) {
      console.error("Error fetching weight progress:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 50 }} />;
  }

  if (weightData.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text>No weight data available yet.</Text>
      </View>
    );
  }

  const chartData = {
    labels: weightData.map((item) => item.date.slice(5)), // show MM-DD
    datasets: [
      {
        data: weightData.map((item) => item.weight),
        color: () => "#007AFF", // line color
        strokeWidth: 2,
      },
    ],
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Weight Progress</Text>
      <LineChart
        data={chartData}
        width={screenWidth - 30}
        height={250}
        yAxisSuffix="kg"
        chartConfig={{
          backgroundGradientFrom: "#f5f5f5",
          backgroundGradientTo: "#f5f5f5",
          color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          propsForDots: {
            r: "5",
            strokeWidth: "2",
            stroke: "#007AFF",
          },
        }}
        bezier
        style={styles.chart}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
  chart: {
    borderRadius: 12,
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 60,
  },
});
