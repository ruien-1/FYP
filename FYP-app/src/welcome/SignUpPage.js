import React, { useState } from "react";
import { StyleSheet, Text, View, TouchableOpacity, TextInput, Alert, ScrollView, } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { signupUser, loginUser, checkEmailVerified } from "../auth";
import API from "../api/backend";
import NutritionistSignup from "./NutritionistSignup";
import CoachSignup from "./CoachSignup";

const SignUpPage = ({ navigation }) => {
  const [question, setQuestion] = useState(1);
  const [userType, setUserType] = useState(""); // "user", "nutritionist", or "coach"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [profile, setProfile] = useState({
    name: "",
    gender: "",
    age: "",
    height: "",
    weight: "",
    postalCode: "",
    countryofresidence: "",
    goals: [],
    challenges: [],
    personalizedPref: null,
    activityLevel: "",
    targetWeight: "",
    weightLossGoal: "",
  });

  // STEP 1: User signs up
  const handleSignUp = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Email and password are required");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }
    if (
      password.length < 6 ||
      !/[a-z]/.test(password) ||
      !/[A-Z]/.test(password) ||
      !/[!@#$%^&*(),.?":{}|<>]/.test(password)
    ) {
      Alert.alert(
        "Error",
        "Password must be at least 6 characters long and include uppercase, lowercase, and a special character"
      );
      return;
    }
    try {
      const result = await signupUser(email, password);
      if (!result.success) {
        if (result.error.includes("auth/email-already-in-use")) {
          Alert.alert(
            "Error",
            "This email is already registered. Please log in instead."
          );
          return;
        }
        throw new Error(result.error);
      }
      Alert.alert(
        "Verify Your Email",
        "A verification link has been sent to your email. Please click the link and then press 'Continue' below.",
        [{ text: "Continue", onPress: handleContinueAfterVerification }]
      );
    } catch (error) {
      console.error("Signup error:", error);
      Alert.alert("Signup Error", error.message);
    }
  };

  // STEP 2: Continue after verification
  const handleContinueAfterVerification = async () => {
    try {
      const verified = await checkEmailVerified(email, password);
      if (!verified) {
        Alert.alert(
          "Email Not Verified",
          "Please click the verification link in your email first, then press 'Check Again'.",
          [
            { text: "Check Again", onPress: handleContinueAfterVerification }
          ]
        );
        return;
      }
      const loginResult = await loginUser(email, password);
      if (!loginResult.success) throw new Error(loginResult.error);
      const user = loginResult.user;
      const response = await API.post("/complete-signup", {
        uid: user.uid,
        email,
        profile: {
          ...profile,
          userType,
          height: Number(profile.height),
          weight: Number(profile.weight),
          age: Number(profile.age),
          targetWeight: Number(profile.targetWeight),
          weightLossGoal: profile.weightLossGoal,
        },
      });
      if (!response.data.success) {
        throw new Error(response.data.error || "Failed to save profile");
      }
      Alert.alert("Success!", "Your account has been created!", [
        { text: "Continue", onPress: () => navigation.navigate("Login") },
      ]);
    } catch (error) {
      console.error("Verification flow error:", error);
      Alert.alert("Error", error.message);
    }
  };

  const Checkbox = ({ label, group }) => {
    const isSelected = profile[group].includes(label);
    const canSelect = group !== "goals" || profile.goals.length < 3 || isSelected;
    return (
      <TouchableOpacity
        style={[
          styles.checkboxRow,
          { backgroundColor: isSelected ? "#3498db" : "#34495e", opacity: canSelect ? 1 : 0.5 },
        ]}
        onPress={() => {
          if (!canSelect) {
            Alert.alert("Limit Reached", "You can only select up to 3 goals");
            return;
          }
          setProfile((prev) => ({
            ...prev,
            [group]: isSelected ? prev[group].filter((x) => x !== label) : [...prev[group], label],
          }));
        }}
      >
        <Text style={{ color: "white" }}>{label}</Text>
        {isSelected && <Ionicons name="checkmark" size={20} color="white" />}
      </TouchableOpacity>
    );
  };

  const Radio = ({ label, group, desc }) => {
    const isSelected = profile[group] === label;
    return (
      <TouchableOpacity
        style={[styles.radioRow, { backgroundColor: isSelected ? "#3498db" : "#34495e" }]}
        onPress={() => setProfile((prev) => ({ ...prev, [group]: label }))}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.radioLabel}>{label}</Text>
          {desc && <Text style={styles.radioDesc}>{desc}</Text>}
        </View>
        {isSelected && <Ionicons name="radio-button-on" size={20} color="white" />}
      </TouchableOpacity>
    );
  };

  // If nutritionist is selected, show the nutritionist signup component
  if (userType === "nutritionist") {
    return (
      <NutritionistSignup
        navigation={navigation}
        onBack={() => setUserType("")}
        onComplete={(nutritionistProfile, email, password) => {
          setProfile(nutritionistProfile);
          setEmail(email);
          setPassword(password);
          handleSignUp();
        }}
      />
    );
  }

  // If coach is selected, show the coach signup component
  if (userType === "coach") {
    return (
      <CoachSignup
        navigation={navigation}
        onBack={() => setUserType("")}
        onComplete={(coachProfile, email, password) => {
          setProfile(coachProfile);
          setEmail(email);
          setPassword(password);
          handleSignUp();
        }}
      />
    );
  }

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => {
          if (question === 1) {
            navigation.goBack();
          } else {
            setQuestion(question - 1);
          }
        }}
      >
        <Ionicons name="chevron-back" size={28} color="white" />
      </TouchableOpacity>

      {/* Question 1: Select User Type */}
      {question === 1 && (
        <View style={styles.inner}>
          <Text style={styles.header}>Sign Up</Text>
          <Text style={styles.subtitle}>Choose your account type</Text>
          <TouchableOpacity style={styles.userTypeButton} onPress={() => setQuestion(2)} >
            <Ionicons name="person" size={40} color="#3498db" />
            <Text style={styles.userTypeTitle}>Sign up as User</Text>
            <Text style={styles.userTypeDesc}>
              Track your health, get personalized meal plans, and achieve your fitness goals
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.userTypeButton} onPress={() => setUserType("nutritionist")} >
            <Ionicons name="nutrition-outline" size={40} color="#3498db" />
            <Text style={styles.userTypeTitle}>Sign up as Nutritionist</Text>
            <Text style={styles.userTypeDesc}>
              Help clients achieve their health goals with professional guidance
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.userTypeButton} onPress={() => setUserType("coach")} >
            <Ionicons name="barbell" size={40} color="#3498db" />
            <Text style={styles.userTypeTitle}>Sign up as Coach</Text>
            <Text style={styles.userTypeDesc}>
              Guide clients through fitness journeys and help them reach their wellness goals
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {question === 2 && (
        <View style={styles.inner}>
          <Text style={styles.header}>Welcome</Text>
          <Text style={styles.subtitle}>How should we address you?</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Preferred Name</Text>
            <TextInput
              style={styles.input}
              value={profile.name}
              onChangeText={(t) => setProfile({ ...profile, name: t })}
            />
          </View>
          <TouchableOpacity
            style={[styles.buttonPrimary, { opacity: profile.name.trim() ? 1 : 0.5 }]}
            onPress={() => profile.name.trim() && setQuestion(3)}
          >
            <Text style={styles.buttonText}>Next</Text>
          </TouchableOpacity>
        </View>
      )}

      {question === 3 && (
        <View style={styles.inner}>
          <Text style={styles.header}>Tell us about yourself</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Gender</Text>
            <TextInput
              style={styles.input}
              value={profile.gender}
              onChangeText={(t) => {
                const upper = t.toUpperCase();
                if (upper === "M" || upper === "F" || upper === "") {
                  setProfile({ ...profile, gender: upper });
                }
              }}
              maxLength={1}
            />
            <Text style={styles.helperText}>Enter M or F</Text>
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Age</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={profile.age}
              onChangeText={(t) => setProfile({ ...profile, age: t })}
            />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Height (cm)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={profile.height}
              onChangeText={(t) => setProfile({ ...profile, height: t })}
            />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Weight (kg)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={profile.weight}
              onChangeText={(t) => setProfile({ ...profile, weight: t })}
            />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Postal Code</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={profile.postalCode}
              onChangeText={(t) => setProfile({ ...profile, postalCode: t })}
            />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Country of Residence</Text>
            <TextInput
              style={styles.input}
              value={profile.countryofresidence}
              onChangeText={(t) => setProfile({ ...profile, countryofresidence: t })}
            />
          </View>
          <TouchableOpacity
            style={[
              styles.buttonPrimary,
              { opacity: profile.gender && profile.age && profile.height && profile.weight && profile.postalCode && profile.countryofresidence ? 1 : 0.5 },
            ]}
            disabled={!(profile.gender && profile.age && profile.height && profile.weight && profile.postalCode && profile.countryofresidence)}
            onPress={() => setQuestion(4)}
          >
            <Text style={styles.buttonText}>Next</Text>
          </TouchableOpacity>
        </View>
      )}

      {question === 4 && (
        <View style={styles.inner}>
          <Text style={styles.header}>Primary Goals</Text>
          <Text style={styles.subtitle}>Select up to 3 ({profile.goals.length}/3 selected)</Text>
          {["Lose Weight", "Improve Health", "Gain Muscles", "Stay Active", "Improve Diet"].map((g) => (
            <Checkbox key={g} label={g} group="goals" />
          ))}
          <TouchableOpacity style={[styles.buttonPrimary, { opacity: profile.goals.length > 0 ? 1 : 0.5 }]} onPress={() => profile.goals.length > 0 && setQuestion(5)} >
            <Text style={styles.buttonText}>Next</Text>
          </TouchableOpacity>
        </View>
      )}

      {question === 5 && (
        <View style={styles.inner}>
          <Text style={styles.header}>Challenges you faced</Text>
          <Text style={styles.subtitle}>Select any that apply (optional)</Text>
          {[
            "Lack of Perseverance",
            "Lack of Time",
            "Too hard to follow",
            "Food Cravings",
            "Meals taste bad",
            "Lacks variety",
            "Social Life",
            "Expensive meals",
            "Cooking hard",
            "Cooking time-consuming",
          ].map((c) => (
            <Checkbox key={c} label={c} group="challenges" />
          ))}
          <TouchableOpacity style={styles.buttonPrimary} onPress={() => setQuestion(6)}>
            <Text style={styles.buttonText}>Next</Text>
          </TouchableOpacity>
        </View>
      )}

      {question === 6 && (
        <View style={styles.inner}>
          <Text style={styles.header}>Personalized Plan?</Text>
          {["Yes, I would love that", "No thanks"].map((p) => (
            <Radio key={p} label={p} group="personalizedPref" />
          ))}
          <TouchableOpacity
            style={[styles.buttonPrimary, { opacity: profile.personalizedPref ? 1 : 0.5 }]}
            disabled={!profile.personalizedPref}
            onPress={() => setQuestion(7)}
          >
            <Text style={styles.buttonText}>Next</Text>
          </TouchableOpacity>
        </View>
      )}

      {question === 7 && (
        <View style={styles.inner}>
          <Text style={styles.header}>Daily activity level</Text>
          {[
            { label: "Not Very Active", desc: "Mostly seated (e.g., desk job)" },
            { label: "Lightly Active", desc: "Some standing (e.g., salesperson)" },
            { label: "Active", desc: "Physical job (e.g., delivery)" },
            { label: "Very Active", desc: "Heavy physical work (e.g., cyclist)" },
          ].map((a) => (
            <Radio key={a.label} label={a.label} desc={a.desc} group="activityLevel" />
          ))}
          <TouchableOpacity style={[styles.buttonPrimary, { opacity: profile.activityLevel ? 1 : 0.5 }]} disabled={!profile.activityLevel} onPress={() => setQuestion(8)} >
            <Text style={styles.buttonText}>Next</Text>
          </TouchableOpacity>
        </View>
      )}

      {question === 8 && (
        <View style={styles.inner}>
          <Text style={styles.header}>Your goals</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Target Weight (kg)</Text>
            <TextInput 
              style={styles.input} 
              keyboardType="numeric" 
              value={profile.targetWeight} 
              onChangeText={(t) => setProfile({ ...profile, targetWeight: t })} 
            />
          </View>
          <Text style={styles.subtitle}>Weekly goal</Text>
          {["Lose 0.3kg/week", "Lose 0.5kg/week", "Lose 0.7kg/week", "Lose 1kg/week"].map((wg) => (
            <Radio key={wg} label={wg} group="weightLossGoal" />
          ))}
          <TouchableOpacity style={[styles.buttonPrimary, { opacity: profile.targetWeight && profile.weightLossGoal ? 1 : 0.5 }]} disabled={!(profile.targetWeight && profile.weightLossGoal)} onPress={() => setQuestion(9)} >
            <Text style={styles.buttonText}>Next</Text>
          </TouchableOpacity>
        </View>
      )}

{question === 9 && (
  <View style={styles.inner}>
    <Text style={styles.header}>Last Step! Create your account</Text>

    {/* Email Field */}
    <View style={styles.inputContainer}>
      <Text style={styles.label}>Email</Text>
      <TextInput
        style={[styles.input, { color: "black" }]}
        placeholder="Email"
        placeholderTextColor="#7f8c8d"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
    </View>

    {/* Password Field */}
    <View style={styles.inputContainer}>
      <Text style={styles.label}>Password</Text>
      <View style={styles.passwordContainer}>
        <TextInput
          style={[styles.passwordInput, { color: "black" }]}
          placeholder="Password"
          placeholderTextColor="#7f8c8d"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
          autoCapitalize="none"
        />
        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          style={styles.eyeIcon}
        >
          <Ionicons
            name={showPassword ? "eye-off" : "eye"}
            size={24}
            color="#7f8c8d"
          />
        </TouchableOpacity>
      </View>
      <Text style={styles.helperText}>
        Minimum 6 characters with uppercase, lowercase, and special character
      </Text>
    </View>

    <TouchableOpacity style={styles.buttonPrimary} onPress={handleSignUp}>
      <Text style={styles.buttonText}>Create Account</Text>
    </TouchableOpacity>
  </View>
)}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#2c3e50" },
  backButton: { marginTop: 50, marginLeft: 20 },
  inner: { flex: 1, alignItems: "center", padding: 20 },
  header: { fontSize: 20, fontWeight: "bold", color: "white", marginBottom: 10, textAlign: "center" },
  subtitle: { fontSize: 14, color: "white", marginBottom: 15, textAlign: "center" },
  inputContainer: { width: "90%", marginVertical: 10 },
  label: { color: "white", fontSize: 16, fontWeight: "600", marginBottom: 8 },
  input: { width: "100%", backgroundColor: "white", padding: 12, borderRadius: 8 },
  helperText: { color: "#bbb", fontSize: 12, marginTop: 4 },
  buttonPrimary: { backgroundColor: "#3498db", padding: 15, borderRadius: 8, marginTop: 15, width: "90%", alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "bold" },
  checkboxRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12, marginVertical: 5, width: "90%", borderRadius: 8 },
  radioRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12, marginVertical: 5, width: "90%", borderRadius: 8 },
  radioLabel: { color: "white", fontSize: 14 },
  radioDesc: { color: "#bbb", fontSize: 12 },
  userTypeButton: { backgroundColor: "#34495e", padding: 20, borderRadius: 12, width: "90%", alignItems: "center", marginVertical: 10, borderWidth: 2, borderColor: "#3498db" },
  userTypeTitle: { color: "white", fontSize: 18, fontWeight: "bold", marginTop: 10, marginBottom: 5 },
  userTypeDesc: { color: "#bbb", fontSize: 13, textAlign: "center", paddingHorizontal: 10 },
  passwordContainer: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "white",
  borderRadius: 8,
  paddingRight: 10,
},
passwordInput: {
  flex: 1,
  padding: 12,
  color: "black",
},
eyeIcon: {
  paddingHorizontal: 5,
},

});

export default SignUpPage;