// UpgradePremium.js
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { auth, db } from "../../firebaseConfig";
import { doc, getDoc } from "firebase/firestore";

export default function UpgradePremium() {
  const navigation = useNavigation();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [userName, setUserName] = useState("User");
  const [profileImage, setProfileImage] = useState(null);

  // Fetch user data
  const fetchUserData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userRef = doc(db, "user", user.uid);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        const data = snap.data();
        setUserName(data.name || "User");
        setProfileImage(data.profileImage || null);
      }
    } catch (error) {
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchUserData();
    }, [])
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="chevron-back" size={28} color="#000" />
      </TouchableOpacity>

      {/* Profile */}
      <View style={styles.profileContainer}>
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
        <Text style={styles.username}>{userName}</Text>
      </View>

      {/* Subscription Options */}
      <View style={styles.planContainer}>
        <TouchableOpacity
          style={[
            styles.planBox,
            selectedPlan === "monthly" && styles.selectedPlanBox,
          ]}
          onPress={() => setSelectedPlan("monthly")}
        >
          <Text style={styles.planTitle}>Monthly</Text>
          <Text style={styles.planPrice}>$8.99</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.planBox,
            selectedPlan === "yearly" && styles.selectedPlanBox,
          ]}
          onPress={() => setSelectedPlan("yearly")}
        >
          <Text style={styles.planTitle}>Yearly</Text>
          <Text style={styles.planPrice}>$92.00</Text>
          <Text style={styles.planDiscount}>15% off</Text>
        </TouchableOpacity>
      </View>

      {/* What's Included */}
      <View style={styles.includedSection}>
        <Text style={styles.includedTitle}>What’s Included</Text>

        <View style={styles.includedItem}>
          <Ionicons name="checkmark" size={18} color="green" />
          <Text style={styles.includedText}>Unlimited Access to all Features</Text>
        </View>

        <View style={styles.includedItem}>
          <Ionicons name="checkmark" size={18} color="green" />
          <Text style={styles.includedText}>Personalized Recommendations</Text>
        </View>

        <View style={styles.includedItem}>
          <Ionicons name="checkmark" size={18} color="green" />
          <Text style={styles.includedText}>Advanced Tracking Tools</Text>
        </View>
      </View>

      {/* Get Premium Button */}
        <TouchableOpacity
          style={styles.premiumButton}
          onPress={() => {
            if (selectedPlan) {
              navigation.navigate("CheckoutScreen", { selectedPlan });
            } else {
              alert("Please select a plan first");
            }
          }}
        >
          <Text style={styles.premiumButtonText}>
            {selectedPlan
              ? `Get ${selectedPlan === "monthly" ? "Monthly" : "Yearly"} Premium`
              : "Get Premium"}
          </Text>
        </TouchableOpacity>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E9F0FA",
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 15,
    zIndex: 1,
  },
  profileContainer: {
    alignItems: "center",
    marginVertical: 60,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#4a6cf7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: "700",
    color: "#fff",
  },
  username: {
    fontSize: 18,
    fontWeight: "600",
  },
  planContainer: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    marginVertical: 25,
  },
  planBox: {
    backgroundColor: "#fff",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    width: 170,
    height: 180,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    borderWidth: 2,
    borderColor: "transparent",
  },
  selectedPlanBox: {
    borderColor: "#445A86",
  },
  planTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  planPrice: {
    fontSize: 22,
    fontWeight: "700",
    marginTop: 8,
  },
  planDiscount: {
    fontSize: 15,
    color: "green",
    marginTop: 6,
  },
  includedSection: {
    marginHorizontal: 20,
    marginVertical: 20,
  },
  includedTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
  },
  includedItem: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 5,
  },
  includedText: {
    fontSize: 15,
    marginLeft: 10,
  },
  premiumButton: {
    alignSelf: "center",
    backgroundColor: "#fff",
    paddingVertical: 14,
    paddingHorizontal: 50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#000",
    marginTop: "auto",
    marginBottom: 30,
  },
  premiumButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
