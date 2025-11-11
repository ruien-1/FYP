import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { LineChart } from "react-native-chart-kit";
import API from "../../api/backend";

export default function NutriUpcomingAppointment() {
  const navigation = useNavigation();
  const route = useRoute();
  
  const { userId, appointmentDate, userName } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [userDetails, setUserDetails] = useState(null);
  const [userGoals, setUserGoals] = useState(null);
  const [weightData, setWeightData] = useState([]);
  const [loadingWeight, setLoadingWeight] = useState(true);
  const [goalLineData, setGoalLineData] = useState([]);

  useEffect(() => {
    if (userId) {
      fetchUserDetails();
      fetchUserGoals();
      fetchWeightProgress();
    }
  }, [userId]);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      const response = await API.get(`/user_info/${userId}`);
      setUserDetails(response.data);
    } catch (error) {
      setUserDetails({
        name: userName,
      });
    } finally {
      setLoading(false);
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

  const fetchUserGoals = async () => {
    try {
      const response = await API.get(`/goals/${userId}`);
      setUserGoals(response.data);
    } catch (error) {
    }
  };

  const fetchWeightProgress = async () => {
    try {
      setLoadingWeight(true);
      const res = await API.get(`/weight_progress/${userId}`);
      const data = res.data || [];
      setWeightData(data);

      if (data.length > 0) {
        await generateGoalLine(data);
      }
    } catch (err) {
    } finally {
      setLoadingWeight(false);
    }
  };

  const generateGoalLine = async (weightDataArray) => {
    try {
      // Fetch goals
      const goalRes = await API.get(`/goals/${userId}`);
      const goalData = goalRes.data;

      // Parse weekly loss (string like "0.5 kg/week")
      const match = goalData?.weightLossGoal?.match(/[\d.]+/);
      const weeklyLoss = match ? parseFloat(match[0]) : 0.3;

      // Fetch initial weight from user_info
      const userRes = await API.get(`/user_info/${userId}`);
      const initialWeight = parseFloat(userRes.data?.weight) || 65;
      const targetWeight = parseFloat(goalData?.targetWeight) || initialWeight - 5;

      // Generate goal line data
      if (weightDataArray.length > 0) {
        const goalDataArray = weightDataArray.map((_, index) => {
          const expectedWeight = initialWeight - (weeklyLoss / 7) * index;

          // Clamp to target weight & round to 2 decimal places
          const validValue = Math.max(targetWeight, expectedWeight);
          const rounded = parseFloat(validValue.toFixed(2));

          // Guard against invalid values
          return isFinite(rounded) && !isNaN(rounded) ? rounded : targetWeight;
        });

        // Filter out anything non-numeric (safety layer)
        const cleanedData = goalDataArray.filter(
          (val) => typeof val === "number" && isFinite(val)
        );

        setGoalLineData(cleanedData);
      }
    } catch (err) {
    }
  };

  const getChallengeText = (value) => {
    // If it's already a string, return it directly
    if (typeof value === 'string') {
      return value;
    }
    // If it's a number, map it
    const challenges = {
      0: "Lack of Perseverance",
      1: "Lack of Time",
      2: "Food Cravings"
    };
    return challenges[value] || "Unknown Challenge";
  };

  const getGoalText = (value) => {
    // If it's already a string, return it directly
    if (typeof value === 'string') {
      return value;
    }
    // If it's a number, map it
    const goals = {
      0: "Lose Weight",
      1: "Improve Health"
    };
    return goals[value] || "Unknown Goal";
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 12, color: "#666" }}>Loading user details...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upcoming Appointments</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Appointment Details */}
      <View style={styles.section}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
          <Ionicons name="calendar-outline" size={24} color="#007AFF" />
          <Text style={styles.appointmentDateTime}>
            {" "}{formatDate(appointmentDate)} at {formatTime(appointmentDate)}
          </Text>
        </View>

        <View style={styles.appointmentCard}>
          <View style={styles.userInfoRow}>
            <Ionicons name="person-circle-outline" size={28} color="#000" />
            <Text style={styles.userName}>{userName}</Text>
          </View>

          <View style={styles.sessionTag}>
            <Text style={styles.sessionTagText}>Virtual Consultation</Text>
          </View>
        </View>
      </View>

      {/* User Details Section */}
      {userDetails && (
        <View style={styles.section}>
          <View style={styles.userHeader}>
            <Ionicons name="person-circle-outline" size={48} color="#007AFF" />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.userHeaderName}>
                {userDetails.name || userName}
              </Text>
              <Text style={styles.userSubtext}>
                Age: {userDetails.age || "N/A"}
              </Text>
            </View>
          </View>

          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Ionicons name="male-female-outline" size={20} color="#007AFF" style={{ marginBottom: 6 }} />
              <Text style={styles.detailLabel}>Gender</Text>
              <Text style={styles.detailValue}>
                {userDetails.gender || "N/A"}
              </Text>
            </View>

            <View style={styles.detailItem}>
              <Ionicons name="resize-outline" size={20} color="#007AFF" style={{ marginBottom: 6 }} />
              <Text style={styles.detailLabel}>Height</Text>
              <Text style={styles.detailValue}>
                {userDetails.height ? `${userDetails.height} cm` : "N/A"}
              </Text>
            </View>

            <View style={styles.detailItem}>
              <Ionicons name="scale-outline" size={20} color="#007AFF" style={{ marginBottom: 6 }} />
              <Text style={styles.detailLabel}>Weight</Text>
              <Text style={styles.detailValue}>
                {userDetails.weight ? `${userDetails.weight} kg` : "N/A"}
              </Text>
            </View>

            <View style={styles.detailItem}>
              <Ionicons name="fitness-outline" size={20} color="#007AFF" style={{ marginBottom: 6 }} />
              <Text style={styles.detailLabel}>Activity Level</Text>
              <Text style={styles.detailValue}>
                {userDetails.activityLevel || "N/A"}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* User Goals Section */}
      {userGoals && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Goals & Preferences</Text>

          {/* Goals */}
          {userGoals.goals && userGoals.goals.length > 0 && (
            <View style={styles.goalsContainer}>
              <Text style={styles.subsectionTitle}>Goals</Text>
              <View style={styles.tagsContainer}>
                {userGoals.goals.map((goal, idx) => (
                  <View key={idx} style={styles.goalTag}>
                    <Ionicons name="flag" size={14} color="#4CAF50" />
                    <Text style={styles.goalTagText}>{getGoalText(goal)}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Challenges */}
          {userGoals.challenges && userGoals.challenges.length > 0 && (
            <View style={styles.goalsContainer}>
              <Text style={styles.subsectionTitle}>Challenges</Text>
              <View style={styles.tagsContainer}>
                {userGoals.challenges.map((challenge, idx) => (
                  <View key={idx} style={styles.challengeTag}>
                    <Ionicons name="alert-circle" size={14} color="#FF9800" />
                    <Text style={styles.challengeTagText}>{getChallengeText(challenge)}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Target Weight & Weight Loss Goal */}
          <View style={styles.goalsGrid}>
            {userGoals.targetWeight && (
              <View style={styles.goalItem}>
                <Ionicons name="trophy-outline" size={20} color="#007AFF" style={{ marginBottom: 6 }} />
                <Text style={styles.detailLabel}>Target Weight</Text>
                <Text style={styles.detailValue}>{userGoals.targetWeight} kg</Text>
              </View>
            )}

            {userGoals.weightLossGoal && (
              <View style={styles.goalItem}>
                <Ionicons name="trending-down-outline" size={20} color="#007AFF" style={{ marginBottom: 6 }} />
                <Text style={styles.detailLabel}>Weight Loss Goal</Text>
                <Text style={styles.detailValue}>{userGoals.weightLossGoal}</Text>
              </View>
            )}
          </View>

          {/* Personalized Preference */}
          {userGoals.personalizedPref && (
            <View style={styles.infoRow}>
              <Ionicons name="heart-outline" size={20} color="#007AFF" />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.infoLabel}>Personalized Preference</Text>
                <Text style={styles.infoValue}>{userGoals.personalizedPref}</Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Weight Progression Chart */}
      {userDetails && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {userDetails.name || userName} Weight Progression
          </Text>
          
          {loadingWeight ? (
            <ActivityIndicator size="large" color="#007AFF" style={{ marginVertical: 30 }} />
          ) : weightData.length === 0 ? (
            <View style={styles.chartPlaceholder}>
              <Ionicons name="stats-chart" size={48} color="#007AFF" style={{ marginBottom: 8 }} />
              <Text style={styles.chartText}>No weight data available</Text>
              <Text style={styles.chartSubtext}>Weight data will appear once the user logs their progress</Text>
            </View>
          ) : (
            <View style={styles.chartContainer}>
              <LineChart
                data={{
                  labels: weightData.map((item) => item.date.slice(5)), // show MM-DD
                  datasets: [
                    {
                      data: weightData.map((item) => item.weight),
                      color: () => "#2ECC71",
                      strokeWidth: 3,
                    },
                    ...(goalLineData.length > 0 ? [{
                      data: goalLineData,
                      color: () => "#FF6B6B",
                      strokeWidth: 2,
                      withDots: false,
                    }] : []),
                  ],
                  legend: goalLineData.length > 0 ? ["Actual Weight", "Goal Line"] : ["Actual Weight"],
                }}
                width={Dimensions.get("window").width - 64}
                height={240}
                yAxisSuffix=" kg"
                chartConfig={{
                  backgroundGradientFrom: "#F0F7FF",
                  backgroundGradientTo: "#F0F7FF",
                  decimalPlaces: 1,
                  color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  propsForDots: {
                    r: "5",
                    strokeWidth: "2",
                    stroke: "#007AFF",
                  },
                  propsForBackgroundLines: {
                    strokeDasharray: "",
                    stroke: "#E0E0E0",
                    strokeWidth: 1,
                  },
                }}
                style={{
                  borderRadius: 12,
                  marginVertical: 10,
                }}
              />
              
              {/* Legend */}
              <View style={styles.legendContainer}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: "#2ECC71" }]} />
                  <Text style={styles.legendText}>Actual Weight</Text>
                </View>
                {goalLineData.length > 0 && (
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: "#FF6B6B" }]} />
                    <Text style={styles.legendText}>Goal Line</Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>
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
    justifyContent: "space-between",
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
  },
  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    marginBottom: 12,
  },
  appointmentDateTime: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  appointmentCard: {
    backgroundColor: "#F6FAFF",
    borderRadius: 12,
    padding: 14,
    borderColor: "#D6E6FF",
    borderWidth: 1,
  },
  userInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  userName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    marginLeft: 10,
  },
  sessionTag: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  sessionTagText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "600",
  },
  userHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  userHeaderName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
  },
  userSubtext: {
    fontSize: 15,
    color: "#666",
    marginTop: 4,
  },
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  detailItem: {
    width: "48%",
    backgroundColor: "#F6FAFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E0EFFF",
  },
  detailLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  detailValue: {
    fontSize: 17,
    fontWeight: "600",
    color: "#000",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F6FAFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E0EFFF",
  },
  infoLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2,
    textTransform: "uppercase",
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "500",
    color: "#000",
  },
  chartPlaceholder: {
    backgroundColor: "#F6FAFF",
    borderRadius: 12,
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 200,
    borderWidth: 1,
    borderColor: "#E0EFFF",
  },
  chartText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
  },
  chartSubtext: {
    color: "#666",
    fontSize: 13,
    marginTop: 4,
    textAlign: "center",
  },
  chartContainer: {
    backgroundColor: "#F6FAFF",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E0EFFF",
  },
  legendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 12,
    gap: 20,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },
  goalsContainer: {
    marginBottom: 20,
  },
  subsectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  goalTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#4CAF50",
    shadowColor: "#4CAF50",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  goalTagText: {
    color: "#2E7D32",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  challengeTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF3E0",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#FF9800",
    shadowColor: "#FF9800",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  challengeTagText: {
    color: "#E65100",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  goalsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 12,
  },
  goalItem: {
    flex: 1,
    backgroundColor: "#F0F7FF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: "#BBDEFB",
    alignItems: "center",
  },
});