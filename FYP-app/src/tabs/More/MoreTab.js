import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, CommonActions, useFocusEffect } from "@react-navigation/native";
import { signOut } from "firebase/auth";  
import { auth, db } from "../../firebaseConfig";
import { doc, getDoc } from "firebase/firestore";

const MoreTab = () => {
  const navigation = useNavigation();
  const [membership, setMembership] = useState("free");
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("User");
  const [profileImage, setProfileImage] = useState(null);

  const fetchUserMembership = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch directly from Firestore
      const userRef = doc(db, "user", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        setMembership(userData.membership || "free");
        setUserName(userData.name || "User");
        setProfileImage(userData.profileImage || null);
      } else {
        // Default to free if user document doesn't exist
        setMembership("free");
        setUserName("User");
        setProfileImage(null);
      }
    } catch (error) {
      console.error("Error fetching membership:", error);
      // Default to free on error
      setMembership("free");
      setUserName("User");
      setProfileImage(null);
    } finally {
      setLoading(false);
    }
  };

  // Fetch membership when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      fetchUserMembership();
    }, [])
  );

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "Welcome" }],
          params: {animatedEnabled: false},
        })
      );
    } catch (error) {
      console.log("Logout error:", error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>More</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* User Avatar + Name */}
        <View style={styles.profileBox}>
          {profileImage ? (
            <Image
              source={{ uri: profileImage }}
              style={styles.avatarImage}
            />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarInitial}>
                {userName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={styles.name}>{userName}</Text>
        </View>

        {/* Menu Items */}
        {membership === "free" && (
          <TouchableOpacity style={styles.menuItem}
            onPress={() => navigation.navigate("UpgradePremium")}
          >
            <Ionicons name="diamond-outline" size={20} color="#4a6cf7" style={styles.menuIcon} />
            <Text style={styles.menuText}>Upgrade to Premium</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate("ProfileTab")}
        >
          <Ionicons name="person-outline" size={20} color="#4a6cf7" style={styles.menuIcon} />
          <Text style={styles.menuText}>My Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}
         onPress={() => navigation.navigate("BMICalculator")}
        >
          <Ionicons name="fitness-outline" size={20} color="#4a6cf7" style={styles.menuIcon} />
          <Text style={styles.menuText}>BMI Calculator</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate("SubmitReview")}
        >
          <Ionicons name="star-outline" size={20} color="#4a6cf7" style={styles.menuIcon} />
          <Text style={styles.menuText}>Rate Us</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E8F0FF",
  },
  header: {
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
  },
  content: {
    padding: 16,
  },
  profileBox: {
    alignItems: "center",
    marginBottom: 20,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#4a6cf7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  avatarImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginBottom: 8,
  },
  avatarInitial: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
  },
  name: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: "#ddd",
  },
  menuIcon: {
    marginRight: 12,
  },
  menuText: {
    fontSize: 15,
    color: "#333",
  },
  logoutButton: {
    backgroundColor: "#f26447",
    margin: 16,
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  logoutText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});

export default MoreTab;