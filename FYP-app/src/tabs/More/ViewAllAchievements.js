import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Dimensions,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from "../../firebaseConfig";
import { doc, onSnapshot, collection, getDocs } from "firebase/firestore";
import {
  getAllAchievementsWithStatus,
  checkAndUnlockCaloriesAchievements,
  checkAndUnlockCaloriesIntakeAchievements,
} from "./achievementUtils";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const ViewAllAchievements = ({ navigation }) => {
  const [streak, setStreak] = useState(0);
  const [totalCaloriesBurned, setTotalCaloriesBurned] = useState(0);
  const [totalCaloriesIntake, setTotalCaloriesIntake] = useState(0);
  const [unlockedAchievements, setUnlockedAchievements] = useState([]);
  const [achievementBadgeImages, setAchievementBadgeImages] = useState({});
  const [selectedAchievement, setSelectedAchievement] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Fetch achievement badge images from shared collection
  const fetchAchievementBadges = async () => {
    try {
      const badgesCollection = collection(db, "achievementBadges");
      const badgesSnapshot = await getDocs(badgesCollection);
      const badgesMap = {};
      
      badgesSnapshot.forEach((doc) => {
        const data = doc.data();
        badgesMap[data.achievementId] = data.imageUrl;
      });
      
      setAchievementBadgeImages(badgesMap);
    } catch (error) {
      console.error("Error fetching achievement badges:", error);
    }
  };

  // Fetch total calories intake from meals_log collection (fallback function)
  const fetchTotalCaloriesIntake = async (uid) => {
    try {
      const mealsRef = collection(db, "meals_log", uid, "meals");
      const mealsSnapshot = await getDocs(mealsRef);
      
      let totalIntake = 0;
      mealsSnapshot.forEach((doc) => {
        const meal = doc.data();
        totalIntake += meal.calories || 0;
      });
      
      setTotalCaloriesIntake(totalIntake);
      
      // Check and unlock calories intake achievements when total calories intake changes
      if (totalIntake > 0) {
        await checkAndUnlockCaloriesIntakeAchievements(totalIntake);
      }
    } catch (error) {
      console.error("Error fetching total calories intake:", error);
    }
  };

  // Fetch total calories burned from activity_log collection (fallback function)
  const fetchTotalCaloriesBurned = async (uid) => {
    try {
      const activitiesRef = collection(db, "activity_log", uid, "entries");
      const activitiesSnapshot = await getDocs(activitiesRef);
      
      let totalBurned = 0;
      activitiesSnapshot.forEach((doc) => {
        const activity = doc.data();
        totalBurned += activity.calories || 0;
      });
      
      setTotalCaloriesBurned(totalBurned);
      
      // Check and unlock calories achievements when total calories burned changes
      if (totalBurned > 0) {
        await checkAndUnlockCaloriesAchievements(totalBurned);
      }
    } catch (error) {
      console.error("Error fetching total calories burned:", error);
    }
  };

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const userRef = doc(db, "user", user.uid);

    // Fetch user data
    const unsubscribeUser = onSnapshot(userRef, async (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const newStreak = data.streak || 0;
        
        setStreak(newStreak);
        setUnlockedAchievements(data.unlockedAchievements || []);
      }
    });

    // Fetch achievement badges from shared collection
    fetchAchievementBadges();

    // Set up listener for activity_log to track calories burned in real-time
    const activitiesRef = collection(db, "activity_log", user.uid, "entries");
    const unsubscribeActivities = onSnapshot(activitiesRef, async (snapshot) => {
      let totalBurned = 0;
      snapshot.forEach((doc) => {
        const activity = doc.data();
        totalBurned += activity.calories || 0;
      });
      
      setTotalCaloriesBurned(totalBurned);
      
      // Check and unlock calories achievements when total calories burned changes
      if (totalBurned > 0) {
        await checkAndUnlockCaloriesAchievements(totalBurned);
      }
    }, (error) => {
      console.error("Error listening to activities:", error);
      // If listener fails, fallback to one-time fetch
      fetchTotalCaloriesBurned(user.uid);
    });

    // Set up listener for meals_log to track calories intake in real-time
    const mealsRef = collection(db, "meals_log", user.uid, "meals");
    const unsubscribeMeals = onSnapshot(mealsRef, async (snapshot) => {
      let totalIntake = 0;
      snapshot.forEach((doc) => {
        const meal = doc.data();
        totalIntake += meal.calories || 0;
      });
      
      setTotalCaloriesIntake(totalIntake);
      
      // Check and unlock calories intake achievements when total calories intake changes
      if (totalIntake > 0) {
        await checkAndUnlockCaloriesIntakeAchievements(totalIntake);
      }
    }, (error) => {
      console.error("Error listening to meals:", error);
      // If listener fails, fallback to one-time fetch
      fetchTotalCaloriesIntake(user.uid);
    });

    return () => {
      unsubscribeUser();
      unsubscribeActivities();
      unsubscribeMeals();
    };
  }, []);

  const allAchievements = getAllAchievementsWithStatus(
    unlockedAchievements,
    streak,
    totalCaloriesBurned,
    totalCaloriesIntake
  );

  const handleAchievementPress = (achievement) => {
    setSelectedAchievement(achievement);
    setModalVisible(true);
  };

  const renderBadge = (achievementId, locked) => {
    const size = 100;
    
    // Get badge image from shared collection
    const badgeImageUrl = achievementBadgeImages[achievementId];
    
    if (badgeImageUrl) {
      return (
        <Image
          source={{ uri: badgeImageUrl }}
          style={{
            width: size,
            height: size,
            opacity: locked ? 0.3 : 1,
          }}
          resizeMode="contain"
        />
      );
    }
    
    // If no image is available, show placeholder
    return (
      <View style={{
        width: size,
        height: size,
        backgroundColor: "#f0f0f0",
        borderRadius: size / 2,
        justifyContent: "center",
        alignItems: "center",
        opacity: locked ? 0.3 : 1,
      }}>
        <Ionicons name="trophy-outline" size={size * 0.5} color="#999" />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Achievements</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Info */}
        <View style={styles.streakInfo}>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text style={styles.streakLabel}>Current Streak</Text>
              <Text style={styles.streakNumber}>{streak} days</Text>
            </View>
            <View style={styles.statDividerVertical} />
            <View style={styles.statItem}>
              <Text style={styles.streakLabel}>Calories Burned</Text>
              <Text style={styles.streakNumber}>{totalCaloriesBurned.toLocaleString()}</Text>
            </View>
          </View>
          <View style={styles.statDividerHorizontal} />
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text style={styles.streakLabel}>Calories Intake</Text>
              <Text style={styles.streakNumber}>{totalCaloriesIntake.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        {/* Achievements Grid */}
        <View style={styles.achievementsGrid}>
          {allAchievements.map((achievement) => (
            <TouchableOpacity
              key={achievement.id}
              style={[
                styles.achievementCard,
                !achievement.unlocked && styles.achievementCardLocked,
              ]}
              onPress={() => handleAchievementPress(achievement)}
              activeOpacity={0.7}
            >
              <View style={styles.badgeWrapper}>
                {renderBadge(achievement.id, !achievement.unlocked)}
                {!achievement.unlocked && (
                  <View style={styles.lockOverlay}>
                    <Ionicons name="lock-closed" size={24} color="#999" />
                  </View>
                )}
              </View>
              <Text
                style={[
                  styles.achievementName,
                  !achievement.unlocked && styles.achievementNameLocked,
                ]}
              >
                {achievement.name}
              </Text>
              {achievement.unlocked ? (
                <Text style={styles.achievementStatus}>✓ Unlocked</Text>
              ) : (
                <Text style={styles.achievementProgress}>
                  {Math.round(achievement.progress)}% complete
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Achievement Detail Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedAchievement && (
              <>
                <View style={styles.modalBadge}>
                  {renderBadge(
                    selectedAchievement.id,
                    !selectedAchievement.unlocked
                  )}
                </View>
                <Text style={styles.modalTitle}>
                  {selectedAchievement.name}
                </Text>
                <Text style={styles.modalDescription}>
                  {selectedAchievement.description}
                </Text>
                {selectedAchievement.unlocked ? (
                  <View style={styles.unlockedInfo}>
                    <Text style={styles.unlockedText}>
                      ✓ Achievement Unlocked!
                    </Text>
                    {selectedAchievement.unlockedAt && (
                      <Text style={styles.unlockedDate}>
                        Unlocked on{" "}
                        {new Date(
                          selectedAchievement.unlockedAt?.toDate?.() ||
                            selectedAchievement.unlockedAt
                        ).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                ) : (
                  <View style={styles.requirementInfo}>
                    <Text style={styles.requirementLabel}>Requirement:</Text>
                    <Text style={styles.requirementText}>
                      {selectedAchievement.type === "streak"
                        ? `Reach ${selectedAchievement.requirement} days streak`
                        : selectedAchievement.type === "calories"
                        ? `Accumulate ${selectedAchievement.requirement.toLocaleString()} calories burned`
                        : `Accumulate ${selectedAchievement.requirement.toLocaleString()} calories intake`}
                    </Text>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${selectedAchievement.progress}%`,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.progressText}>
                      {selectedAchievement.type === "streak" 
                        ? `${streak} / ${selectedAchievement.requirement} days`
                        : selectedAchievement.type === "calories"
                        ? `${totalCaloriesBurned.toLocaleString()} / ${selectedAchievement.requirement.toLocaleString()} calories burned`
                        : `${totalCaloriesIntake.toLocaleString()} / ${selectedAchievement.requirement.toLocaleString()} calories intake`}
                    </Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.modalCloseText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E8F0FF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    backgroundColor: "#fff",
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
  },
  headerSpacer: {
    width: 44,
    height: 44,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  streakInfo: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  streakLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  streakNumber: {
    fontSize: 28,
    fontWeight: "700",
    color: "#4a6cf7",
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    width: "100%",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statDividerVertical: {
    width: 1,
    height: 40,
    backgroundColor: "#ddd",
    marginHorizontal: 20,
  },
  statDividerHorizontal: {
    height: 1,
    width: "100%",
    backgroundColor: "#ddd",
    marginVertical: 16,
  },
  achievementsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  achievementCard: {
    width: (SCREEN_WIDTH - 48) / 2,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  achievementCardLocked: {
    opacity: 0.7,
  },
  badgeWrapper: {
    position: "relative",
    marginBottom: 12,
  },
  lockOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderRadius: 50,
  },
  achievementName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    marginBottom: 4,
  },
  achievementNameLocked: {
    color: "#999",
  },
  achievementStatus: {
    fontSize: 12,
    color: "#4a6cf7",
    fontWeight: "500",
  },
  achievementProgress: {
    fontSize: 12,
    color: "#999",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
  },
  modalBadge: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
  },
  modalDescription: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  unlockedInfo: {
    alignItems: "center",
    marginBottom: 20,
  },
  unlockedText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4a6cf7",
    marginBottom: 8,
  },
  unlockedDate: {
    fontSize: 12,
    color: "#999",
  },
  requirementInfo: {
    width: "100%",
    alignItems: "center",
    marginBottom: 20,
  },
  requirementLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  requirementText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },
  progressBar: {
    width: "100%",
    height: 8,
    backgroundColor: "#e5e5e5",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4a6cf7",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: "#666",
  },
  modalCloseButton: {
    backgroundColor: "#4a6cf7",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  modalCloseText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default ViewAllAchievements;

