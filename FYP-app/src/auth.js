import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendEmailVerification,
  sendPasswordResetEmail,
  reload 
} from "firebase/auth";
import { auth } from "./firebaseConfig";

// Signup
export const signupUser = async (email, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(userCredential.user);
    return { 
      success: true, 
      user: userCredential.user,
      message: "Verification email sent!" 
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Login
export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Refresh user state to get latest emailVerified
    await reload(user);
    
    if (!user.emailVerified) {
      throw new Error("Please verify your email before logging in.");
    }
    
    return { success: true, user };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Check email verification
export const checkEmailVerified = async (email, password) => {
  try {
    // Sign in to get the latest user state
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Reload user to get fresh email verification status
    await reload(userCredential.user);
    
    return userCredential.user.emailVerified;
  } catch (error) {
    console.error("Error checking email verification:", error);
    return false;
  }
};

// Reset password
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { 
      success: true, 
      message: "Password reset email sent successfully!" 
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};