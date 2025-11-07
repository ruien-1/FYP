import React, { useState } from "react";
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  TextInput, 
  Alert, 
  ActivityIndicator 
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { initializeMealReminder } from "../tabs/Home/notificationService";

export default function LoginPage({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password");
      return;
    }

    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (!user.emailVerified) {
        Alert.alert("Email not verified", "Please check your inbox and verify your account first.");
        setLoading(false);
        return;
      }

      const nutritionistRef = doc(db, "nutritionist", user.uid);
      const coachRef = doc(db, "coach", user.uid);
      const userRef = doc(db, "user", user.uid);

      const [nutritionistSnap, coachSnap, userSnap] = await Promise.all([
        getDoc(nutritionistRef),
        getDoc(coachRef),
        getDoc(userRef)
      ]);

      if (nutritionistSnap.exists()) {
        const nutritionistData = nutritionistSnap.data();
        const accountStatus = nutritionistData.accountstatus;

        if (accountStatus === "pending") {
          Alert.alert(
            "Account Under Verification",
            "Your nutritionist account is still under verification. You will be notified once approved."
          );
        } else if (accountStatus === "rejected") {
          Alert.alert(
            "Account Rejected",
            "Unfortunately, your nutritionist account application was not approved. Please contact support."
          );
        } else if (accountStatus === "approved") {
          console.log("Login successful for nutritionist:", nutritionistData.name);
          navigation.navigate("NutritionistTabs");
        } else {
          Alert.alert(
            "Unknown Status",
            "Your account has an unknown status. Please contact support."
          );
        }

        setLoading(false);
        return;
      }

      if (coachSnap.exists()) {
        const coachData = coachSnap.data();
        const accountStatus = coachData.accountstatus;

        if (accountStatus === "pending") {
          Alert.alert(
            "Account Under Verification",
            "Your coach account is still under verification. You will be notified once approved."
          );
        } else if (accountStatus === "rejected") {
          Alert.alert(
            "Account Rejected",
            "Unfortunately, your coach account application was not approved. Please contact support."
          );
        } else if (accountStatus === "approved") {
          console.log("Login successful for coach:", coachData.name);
          navigation.navigate("CoachTabs");
        } else {
          Alert.alert(
            "Unknown Status",
            "Your account has an unknown status. Please contact support."
          );
        }

        setLoading(false);
        return;
      }

      if (userSnap.exists()) {
        const data = userSnap.data();
        const accountStatus = data.accountstatus;

        // 🔹 Check if user account is active
        if (accountStatus === "inactive" || accountStatus === "suspended" || accountStatus === "banned") {
          Alert.alert(
            "Account Inactive",
            "Your account is currently inactive. Please contact support for assistance."
          );
          setLoading(false);
          return;
        }

        if (accountStatus !== "active") {
          Alert.alert(
            "Account Status Unknown",
            "Your account has an unknown status. Please contact support."
          );
          setLoading(false);
          return;
        }

        console.log("Login successful for user:", data.name);
        // Initialize meal reminder after successful login
        initializeMealReminder();
        navigation.navigate("MainTabs");
        setLoading(false);
        return;
      }
      Alert.alert(
        "Account Not Found",
        "No matching account found. Please sign up first."
      );
      setLoading(false);

    } catch (error) {
      setLoading(false);

      if (error.code === "auth/invalid-credential") {
        Alert.alert("Login Error", "Invalid email or password. Please try again.");
      } else if (error.code === "auth/user-not-found") {
        Alert.alert("Login Error", "No account found with this email.");
      } else if (error.code === "auth/wrong-password") {
        Alert.alert("Login Error", "Incorrect password. Please try again.");
      } else if (error.code === "auth/too-many-requests") {
        Alert.alert(
          "Too Many Attempts", 
          "Account temporarily disabled due to many failed login attempts. Please try again later."
        );
      } else {
        Alert.alert("Login Error", error.message);
      }
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="chevron-back" size={28} color="white" />
      </TouchableOpacity>

      <View style={styles.innerContainer}>
        <Ionicons name="person-circle-outline" size={80} color="#90EE90" style={styles.icon} />

        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Log in to your account</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#95a5a6"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />

        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Password"
            placeholderTextColor="#95a5a6"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
            <Ionicons 
              name={showPassword ? "eye-off" : "eye"} 
              size={24} 
              color="#95a5a6" 
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={[styles.loginButton, loading && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.loginButtonText}>Login</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.forgotPassword}
          onPress={() => navigation.navigate("ForgotPassword")}
        >
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
        </TouchableOpacity>

        <View style={styles.signupContainer}>
          <Text style={styles.signupText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate("SignUp")}>
            <Text style={styles.signupLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// 🔹 Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#2c3e50",
  },
  backButton: {
    marginTop: 50,
    marginLeft: 20,
  },
  innerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  icon: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#bdc3c7",
    marginBottom: 40,
  },
  input: {
    width: "100%",
    backgroundColor: "#34495e",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    color: "white",
    fontSize: 16,
  },
  passwordContainer: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#34495e",
    borderRadius: 10,
    marginBottom: 20,
  },
  passwordInput: {
    flex: 1,
    padding: 15,
    color: "white",
    fontSize: 16,
  },
  eyeIcon: {
    padding: 15,
  },
  loginButton: {
    width: "100%",
    backgroundColor: "#90EE90",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 15,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: "#000",
    fontSize: 18,
    fontWeight: "bold",
  },
  forgotPassword: {
    marginBottom: 30,
  },
  forgotPasswordText: {
    color: "#90EE90",
    fontSize: 14,
  },
  signupContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  signupText: {
    color: "#bdc3c7",
    fontSize: 14,
  },
  signupLink: {
    color: "#90EE90",
    fontSize: 14,
    fontWeight: "bold",
  },
});