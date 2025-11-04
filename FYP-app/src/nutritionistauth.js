import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  reload,
} from "firebase/auth";
import { doc, setDoc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "./firebaseConfig";

// Nutritionist Signup
export const signupNutritionist = async (email, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(userCredential.user);
    return {
      success: true,
      user: userCredential.user,
      message: "Verification email sent!",
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Check if Email is Already Registered (Nutritionist)
export const checkNutritionistEmailExists = async (email) => {
  try {
    const nutritionistsRef = collection(db, "nutritionist_info");
    const q = query(nutritionistsRef, where("email", "==", email));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error("Error checking email:", error);
    return false;
  }
};

// Save Nutritionist Profile to Firestore (Mirroring user signup pattern)
export const completeNutritionistSignup = async (uid, email, profile) => {
  try {
    const {
      name,
      age,
      gender,
      languages,
      credentials,
      specializations = [],
      yearsOfExperience,
      bio,
      documentType,
      credentialNumber,
      issuingOrganization,
      placeOfPractice,
      clinicName,
      offersVirtualConsultation,
      servicesOffered = [],
      availability,
    } = profile;

    // Save nutritionist_info (similar to user_info)
    await db.collection("nutritionist_info").doc(uid).set({
      uid,
      name,
      age,
      gender,
      languages,
      credentials,
      specializations,
      yearsOfExperience,
      bio,
      placeOfPractice,
      clinicName,
      offersVirtualConsultation,
      created_on: new Date(),
    });

    // Save nutritionist (similar to user)
    await db.collection("nutritionist").doc(uid).set({
      id: uid,
      name,
      email,
      accountstatus: "pending",
      created_on: new Date(),
    });

    // Save credentials info
    await db.collection("credentialsNutritionist").doc(uid).set({
      uid,
      documentType,
      credentialNumber,
      issuingOrganization,
      created_on: new Date(),
    });

    // Save services offered
    await db.collection("servicesNutritionist").doc(uid).set({
      uid,
      servicesOffered,
      created_on: new Date(),
    });

    // Save availability
    await db.collection("availability").doc(uid).set({
      uid,
      availability,
      created_on: new Date(),
    });

    console.log("Nutritionist info, credentials, services, and availability saved to Firestore");

    return {
      success: true,
      message: "Nutritionist signup completed successfully",
    };
  } catch (error) {
    console.error("Firestore error:", error);
    return { success: false, error: error.message };
  }
};

// Check Email Verification (Nutritionist)
export const checkNutritionistEmailVerified = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    await reload(userCredential.user);
    return userCredential.user.emailVerified;
  } catch (error) {
    console.error("Error checking email verification:", error);
    return false;
  }
};