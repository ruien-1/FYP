// import React, { useState } from "react";
// import { 
//   StyleSheet, 
//   Text, 
//   View, 
//   TouchableOpacity, 
//   TextInput, 
//   Alert,
//   ActivityIndicator 
// } from "react-native";
// import { Ionicons } from "@expo/vector-icons";
// import { signInWithEmailAndPassword } from "firebase/auth";
// import { auth, db } from "../firebaseConfig";
// import { doc, getDoc } from "firebase/firestore";

// export default function NutritionistLogin({ navigation }) {
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [showPassword, setShowPassword] = useState(false);

//   const handleLogin = async () => {
//     if (!email || !password) {
//       Alert.alert("Error", "Please enter both email and password");
//       return;
//     }

//     setLoading(true);

//     try {
//       // Sign in with Firebase Auth
//       const userCredential = await signInWithEmailAndPassword(auth, email, password);
//       const user = userCredential.user;

//       // Check if email is verified
//       if (!user.emailVerified) {
//         Alert.alert(
//           "Email not verified", 
//           "Please check your inbox and verify your email first."
//         );
//         setLoading(false);
//         return;
//       }

//       // Get nutritionist account status from Firestore
//       const nutritionistRef = doc(db, "nutritionist", user.uid);
//       const nutritionistSnap = await getDoc(nutritionistRef);

//       if (!nutritionistSnap.exists()) {
//         Alert.alert(
//           "Account Not Found", 
//           "No nutritionist account found. Please complete your signup."
//         );
//         setLoading(false);
//         return;
//       }

//       const nutritionistData = nutritionistSnap.data();
//       const accountStatus = nutritionistData.accountstatus;

//       // Check account verification status
//       if (accountStatus === "pending") {
//         Alert.alert(
//           "Account Under Verification",
//           "Your account is still under verification. You will be notified once your account is approved.",
//           [{ text: "OK" }]
//         );
//         setLoading(false);
//         return;
//       }

//       if (accountStatus === "rejected") {
//         Alert.alert(
//           "Account Rejected",
//           "Unfortunately, your account application was not approved. Please contact support for more information.",
//           [{ text: "OK" }]
//         );
//         setLoading(false);
//         return;
//       }

//       if (accountStatus === "approved") {
//         // Successfully verified - navigate to nutritionist dashboard
//         console.log("Login successful for nutritionist:", nutritionistData.name);
//         setLoading(false);
        
//         // Navigate to nutritionist main page/dashboard
//         // Replace "NutritionistDashboard" with your actual screen name
//         navigation.navigate("NutritionistDashboard");
//       } else {
//         Alert.alert(
//           "Unknown Status",
//           "Your account has an unknown status. Please contact support."
//         );
//         setLoading(false);
//       }

//     } catch (error) {
//       setLoading(false);
//       console.error("Login error:", error);
      
//       // Handle specific error codes
//       if (error.code === "auth/invalid-credential") {
//         Alert.alert("Login Error", "Invalid email or password. Please try again.");
//       } else if (error.code === "auth/user-not-found") {
//         Alert.alert("Login Error", "No account found with this email.");
//       } else if (error.code === "auth/wrong-password") {
//         Alert.alert("Login Error", "Incorrect password. Please try again.");
//       } else if (error.code === "auth/too-many-requests") {
//         Alert.alert(
//           "Too Many Attempts", 
//           "Account temporarily disabled due to many failed login attempts. Please try again later."
//         );
//       } else {
//         Alert.alert("Login Error", error.message);
//       }
//     }
//   };

//   return (
//     <View style={styles.container}>
//       <TouchableOpacity 
//         style={styles.backButton}
//         onPress={() => navigation.goBack()}
//       >
//         <Ionicons name="chevron-back" size={28} color="white" />
//       </TouchableOpacity>

//       <View style={styles.innerContainer}>
//         <Ionicons name="nutrition" size={80} color="#3498db" style={styles.icon} />
        
//         <Text style={styles.title}>Nutritionist Login</Text>
//         <Text style={styles.subtitle}>Welcome back!</Text>

//         <TextInput
//           style={styles.input}
//           placeholder="Email"
//           placeholderTextColor="#95a5a6"
//           value={email}
//           onChangeText={setEmail}
//           keyboardType="email-address"
//           autoCapitalize="none"
//           autoComplete="email"
//         />

//         <View style={styles.passwordContainer}>
//           <TextInput
//             style={styles.passwordInput}
//             placeholder="Password"
//             placeholderTextColor="#95a5a6"
//             secureTextEntry={!showPassword}
//             value={password}
//             onChangeText={setPassword}
//             autoCapitalize="none"
//           />
//           <TouchableOpacity 
//             onPress={() => setShowPassword(!showPassword)}
//             style={styles.eyeIcon}
//           >
//             <Ionicons 
//               name={showPassword ? "eye-off" : "eye"} 
//               size={24} 
//               color="#95a5a6" 
//             />
//           </TouchableOpacity>
//         </View>

//         <TouchableOpacity
//           style={[styles.loginButton, loading && styles.loginButtonDisabled]}
//           onPress={handleLogin}
//           disabled={loading}
//         >
//           {loading ? (
//             <ActivityIndicator color="white" />
//           ) : (
//             <Text style={styles.loginButtonText}>Login</Text>
//           )}
//         </TouchableOpacity>

//         <TouchableOpacity 
//           style={styles.forgotPassword}
//           onPress={() => {
//             // Navigate to forgot password screen
//             Alert.alert(
//               "Reset Password",
//               "Please contact support to reset your password."
//             );
//           }}
//         >
//           <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
//         </TouchableOpacity>

//         <View style={styles.signupContainer}>
//           <Text style={styles.signupText}>Don't have an account? </Text>
//           <TouchableOpacity onPress={() => navigation.navigate("NutritionistSignup")}>
//             <Text style={styles.signupLink}>Sign Up</Text>
//           </TouchableOpacity>
//         </View>
//       </View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: "#2c3e50",
//   },
//   backButton: {
//     marginTop: 50,
//     marginLeft: 20,
//   },
//   innerContainer: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//     paddingHorizontal: 20,
//   },
//   icon: {
//     marginBottom: 20,
//   },
//   title: {
//     fontSize: 28,
//     fontWeight: "bold",
//     color: "white",
//     marginBottom: 8,
//   },
//   subtitle: {
//     fontSize: 16,
//     color: "#bdc3c7",
//     marginBottom: 40,
//   },
//   input: {
//     width: "100%",
//     backgroundColor: "#34495e",
//     padding: 15,
//     borderRadius: 10,
//     marginBottom: 15,
//     color: "white",
//     fontSize: 16,
//   },
//   passwordContainer: {
//     width: "100%",
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "#34495e",
//     borderRadius: 10,
//     marginBottom: 20,
//   },
//   passwordInput: {
//     flex: 1,
//     padding: 15,
//     color: "white",
//     fontSize: 16,
//   },
//   eyeIcon: {
//     padding: 15,
//   },
//   loginButton: {
//     width: "100%",
//     backgroundColor: "#3498db",
//     padding: 16,
//     borderRadius: 10,
//     alignItems: "center",
//     marginBottom: 15,
//   },
//   loginButtonDisabled: {
//     opacity: 0.6,
//   },
//   loginButtonText: {
//     color: "white",
//     fontSize: 18,
//     fontWeight: "bold",
//   },
//   forgotPassword: {
//     marginBottom: 30,
//   },
//   forgotPasswordText: {
//     color: "#3498db",
//     fontSize: 14,
//   },
//   signupContainer: {
//     flexDirection: "row",
//     alignItems: "center",
//   },
//   signupText: {
//     color: "#bdc3c7",
//     fontSize: 14,
//   },
//   signupLink: {
//     color: "#3498db",
//     fontSize: 14,
//     fontWeight: "bold",
//   },
// });