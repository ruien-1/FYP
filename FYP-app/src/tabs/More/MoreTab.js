import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
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
      } else {
        // Default to free if user document doesn't exist
        setMembership("free");
      }
    } catch (error) {
      console.error("Error fetching membership:", error);
      // Default to free on error
      setMembership("free");
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
          <View style={styles.avatar}>
            <Ionicons name="person-circle" size={70} color="#888" />
          </View>
          <Text style={styles.name}>Tom</Text>
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
    marginBottom: 8,
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