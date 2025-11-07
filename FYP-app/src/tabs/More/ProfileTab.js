import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db } from "../../firebaseConfig";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const WALLPAPER_HEIGHT = SCREEN_HEIGHT * 0.5; // Top half of screen

const ProfileTab = () => {
  const [streak, setStreak] = useState(0);
  const [userName, setUserName] = useState("User");
  const [profileImage, setProfileImage] = useState(null);
  const [wallpaperImage, setWallpaperImage] = useState(null);
  const [achievements, setAchievements] = useState(1);
  const [membership, setMembership] = useState("free");
  const [planType, setPlanType] = useState(null);
  const [renewalDate, setRenewalDate] = useState(null);
  const navigation = useNavigation();

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const userRef = doc(db, "user", user.uid);
    
    // Set up real-time listener for streak updates
    const unsubscribe = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setStreak(data.streak || 0);
        setUserName(data.name || "User");
        setProfileImage(data.profileImage || null);
        setWallpaperImage(data.wallpaperImage || null);
        setMembership(data.membership || "free");
        setPlanType(data.planType || null);
        setRenewalDate(data.renewalDate || null);
        console.log("ProfileTab: Streak updated to", data.streak || 0);
      }
    }, (error) => {
      console.error("Error listening to user data:", error);
    });

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, []);

  // Refresh data when screen is focused (in case listener didn't catch updates)
  useFocusEffect(
    React.useCallback(() => {
      fetchUserData();
    }, [])
  );

  const fetchUserData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userRef = doc(db, "user", user.uid);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        const data = snap.data();
        setStreak(data.streak || 0);
        setUserName(data.name || "User");
        setProfileImage(data.profileImage || null);
        setWallpaperImage(data.wallpaperImage || null);
        setMembership(data.membership || "free");
        setPlanType(data.planType || null);
        setRenewalDate(data.renewalDate || null);
        // You can add achievements count from data if available
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  // Format renewal date for display
  const formatRenewalDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const day = date.getDate();
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Wallpaper Section - Top Half */}
        <View style={styles.wallpaperContainer}>
          {/* Wallpaper Image */}
          <Image
            source={{
              uri: wallpaperImage || "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80"
            }}
            style={styles.wallpaperImage}
            resizeMode="cover"
          />
          
          {/* Overlay for better text visibility */}
          <View style={styles.wallpaperOverlay} />

          {/* Back Button - Top Left */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={28} color="#fff" />
          </TouchableOpacity>

          {/* Edit Icon - Top Right */}
          <TouchableOpacity
            style={styles.editIconButton}
            onPress={() => navigation.navigate("EditProfile")}
          >
            <Ionicons name="create-outline" size={24} color="#fff" />
          </TouchableOpacity>

          {/* Profile Picture - Positioned at 2/5 from top */}
          <View style={styles.profilePictureContainer}>
            {profileImage ? (
              <Image
                source={{ uri: profileImage }}
                style={styles.profilePicture}
              />
            ) : (
              <View style={styles.profilePicturePlaceholder}>
                <Text style={styles.profilePictureInitial}>
                  {userName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          {/* User Name */}
          <View style={styles.userNameContainer}>
            <Text style={styles.userName}>{userName}</Text>
          </View>

          {/* Stats Container - Translucent, slightly above bottom */}
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{streak}</Text>
              <Text style={styles.statLabel}>Day streak</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{achievements}</Text>
              <Text style={styles.statLabel}>Achievements</Text>
            </View>
          </View>
        </View>

        {/* Second Half - Achievements and Membership */}
        <View style={styles.bottomSection}>
          {/* Achievements */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Achievements</Text>
              <Text style={styles.viewAll}>View all</Text>
            </View>
            <View style={styles.achievementBox}>
              <Text style={styles.achievementIcon}>🏆</Text>
            </View>
          </View>

          {/* Membership */}
          {membership === "premium" && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Membership</Text>
              <View style={styles.membershipBox}>
                <View style={styles.membershipHeader}>
                  <Text style={styles.membershipText}>
                    {renewalDate
                      ? `Renews on ${formatRenewalDate(renewalDate)} (${planType === "monthly" ? "Monthly" : "Yearly"} Plan)`
                      : "Premium Membership"}
                  </Text>
                  <View style={styles.premiumTag}>
                    <Text style={styles.premiumText}>Premium</Text>
                  </View>
                </View>
                <Text style={styles.benefit}>✅ Unlimited access to all features</Text>
                <TouchableOpacity style={styles.manageButton}
                  onPress={() => navigation.navigate("ManageMembership")}
                >
                  <Text style={styles.manageText}>Manage Membership</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E8F0FF",
  },
  scrollView: {
    flex: 1,
  },
  // Wallpaper Section
  wallpaperContainer: {
    height: WALLPAPER_HEIGHT,
    width: "100%",
    position: "relative",
  },
  wallpaperImage: {
    width: "100%",
    height: "100%",
  },
  wallpaperOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.3)", // Dark overlay for better text visibility
  },
  backButton: {
    position: "absolute",
    top: 40,
    left: 10,
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  editIconButton: {
    position: "absolute",
    top: 40,
    right: 20,
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  profilePictureContainer: {
    position: "absolute",
    top: WALLPAPER_HEIGHT * 0.30, // Moved up - around 35% from top
    left: "50%",
    marginLeft: -60, // Half of profile picture width (120/2)
    zIndex: 5,
  },
  profilePicture: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: "#fff",
  },
  profilePicturePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#4a6cf7",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#fff",
  },
  profilePictureInitial: {
    fontSize: 48,
    fontWeight: "700",
    color: "#fff",
  },
  userNameContainer: {
    position: "absolute",
    top: WALLPAPER_HEIGHT * 0.58, // Slightly below halfway mark (52%)
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 5,
  },
  userName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  statsContainer: {
    position: "absolute",
    bottom: 25, // Slightly above bottom
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "rgba(255, 255, 255, 0.2)", // More translucent
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.35)",
    zIndex: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statBox: {
    alignItems: "center",
    flex: 1,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  statLabel: {
    fontSize: 14,
    color: "#fff",
    marginTop: 4,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
    marginHorizontal: 10,
  },
  // Bottom Section
  bottomSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 20,
  },
  section: {
    marginBottom: 22,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  viewAll: {
    fontSize: 14,
    fontWeight: "500",
    color: "#4a6cf7",
  },
  achievementBox: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e5e5",
  },
  achievementIcon: {
    fontSize: 38,
  },
  membershipBox: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  membershipHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  membershipText: {
    fontSize: 14,
    flex: 1,
    marginRight: 10,
    color: "#333",
  },
  premiumTag: {
    backgroundColor: "#f5a623",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  premiumText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  benefit: {
    marginTop: 6,
    color: "green",
    fontSize: 13,
  },
  manageButton: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  manageText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
});


export default ProfileTab;
