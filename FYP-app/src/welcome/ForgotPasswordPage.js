import React, { useState } from "react";
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  TextInput, 
  Alert, 
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebaseConfig";

export default function ForgotPasswordPage({ navigation }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Invalid Email", "Please enter a valid email address");
      return;
    }

    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setEmailSent(true);
      setLoading(false);
      
      Alert.alert(
        "Email Sent",
        "Password reset email has been sent. Please check your inbox or spam folder for further instructions to reset your password.",
        [
          {
            text: "OK",
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      setLoading(false);
      
      if (error.code === "auth/user-not-found") {
        Alert.alert(
          "Email Not Found",
          "No account found with this email address. Please check your email or sign up."
        );
      } else if (error.code === "auth/invalid-email") {
        Alert.alert("Invalid Email", "Please enter a valid email address");
      } else if (error.code === "auth/too-many-requests") {
        Alert.alert(
          "Too Many Requests",
          "Too many password reset attempts. Please try again later."
        );
      } else {
        Alert.alert("Error", error.message);
      }
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="chevron-back" size={28} color="white" />
      </TouchableOpacity>

      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.innerContainer}>
            <Ionicons name="lock-closed-outline" size={80} color="#90EE90" style={styles.icon} />

            <Text style={styles.title}>Forgot Password?</Text>
            <Text style={styles.subtitle}>
              Enter your email address and we'll send you instructions to reset your password
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#95a5a6"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              editable={!emailSent}
            />

            <TouchableOpacity 
              style={[styles.resetButton, (loading || emailSent) && styles.resetButtonDisabled]}
              onPress={handleResetPassword}
              disabled={loading || emailSent}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.resetButtonText}>
                  {emailSent ? "Email Sent" : "Send Reset Link"}
                </Text>
              )}
            </TouchableOpacity>

            {emailSent && (
              <View style={styles.successContainer}>
                <Ionicons name="checkmark-circle" size={24} color="#90EE90" />
                <Text style={styles.successText}>
                  Check your email for password reset instructions
                </Text>
              </View>
            )}

            <View style={styles.backToLoginContainer}>
              <Text style={styles.backToLoginText}>Remember your password? </Text>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Text style={styles.backToLoginLink}>Back to Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#2c3e50",
  },
  backButton: {
    marginTop: 50,
    marginLeft: 20,
    zIndex: 10,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  innerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 40,
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
    fontSize: 14,
    color: "#bdc3c7",
    marginBottom: 40,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  input: {
    width: "100%",
    backgroundColor: "#34495e",
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    color: "white",
    fontSize: 16,
  },
  resetButton: {
    width: "100%",
    backgroundColor: "#90EE90",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 20,
  },
  resetButtonDisabled: {
    opacity: 0.6,
  },
  resetButtonText: {
    color: "#000",
    fontSize: 18,
    fontWeight: "bold",
  },
  successContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#34495e",
    padding: 15,
    borderRadius: 10,
    marginBottom: 30,
  },
  successText: {
    color: "#90EE90",
    fontSize: 14,
    marginLeft: 10,
    flex: 1,
  },
  backToLoginContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  backToLoginText: {
    color: "#bdc3c7",
    fontSize: 14,
  },
  backToLoginLink: {
    color: "#90EE90",
    fontSize: 14,
    fontWeight: "bold",
  },
});