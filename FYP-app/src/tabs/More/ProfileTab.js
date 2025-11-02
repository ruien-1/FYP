import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db } from "../../firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

const ProfileTab = () => {
  const [streak, setStreak] = useState(0);
  const navigation = useNavigation();

  useEffect(() => {
    const fetchStreak = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        const userRef = doc(db, "user", user.uid);
        const snap = await getDoc(userRef);

        if (snap.exists()) {
          const data = snap.data();
          setStreak(data.streak || 0);
        }
      } catch (error) {
        console.error("Error fetching streak:", error);
      }
    };

    fetchStreak();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
    {/* Header */}
    <View style={styles.headerRow}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Ionicons name="chevron-back" size={26} color="#333" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>My Profile</Text>
      <View style={{ width: 26 }} />
    </View>


      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.profileInfo}>
          <Text style={styles.name}>Tom</Text>
          <Text style={styles.bio} numberOfLines={2}>
            This is Tom’s bio
          </Text>
        </View>
        <TouchableOpacity style={styles.editButton}
          onPress={() => navigation.navigate("EditProfile")}
        
        >
          <Text style={styles.editText}>Edit profile</Text>
        </TouchableOpacity>
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <View style={styles.infoBox}>
          <Text style={styles.infoNumber}>{streak}</Text>
          <Text style={styles.infoLabel}>Day streak</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoBox}>
          <Text style={styles.infoNumber}>1</Text>
          <Text style={styles.infoLabel}>Achievements</Text>
        </View>
      </View>

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
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Membership</Text>
        <View style={styles.membershipBox}>
          <View style={styles.membershipHeader}>
            <Text style={styles.membershipText}>
              Renews on 20 September 2025 (Monthly Plan)
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E8F0FF", 
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  backArrow: {
    fontSize: 24,
    color: "#333",
    paddingHorizontal: 6,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: "#555",
  },

  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 14,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  bio: {
    fontSize: 14,
    color: "#777",
    maxWidth: "95%",
  },
  editButton: {
    backgroundColor: "#eef1f6",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
  },
  editText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#444",
  },
  infoCard: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 18,
    marginBottom: 18,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  infoBox: {
    alignItems: "center",
    flex: 1,
  },
  infoNumber: {
    fontSize: 22,
    fontWeight: "700",
    color: "#222",
  },
  infoLabel: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  divider: {
    width: 1,
    backgroundColor: "#e5e5e5",
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
