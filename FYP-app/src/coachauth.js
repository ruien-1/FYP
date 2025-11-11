import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  reload,
} from "firebase/auth";
import { doc, setDoc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "./firebaseConfig";

// Coach Signup
export const signupCoach = async (email, password) => {
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

// Check if Email is Already Registered (Coach)
export const checkCoachEmailExists = async (email) => {
  try {
    const coachesRef = collection(db, "coach_info");
    const q = query(coachesRef, where("email", "==", email));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    return false;
  }
};

// Save Coach Profile to Firestore (Mirroring nutritionist signup pattern)
export const completeCoachSignup = async (uid, email, profile) => {
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
      gymName,
      offersVirtualConsultation,
      servicesOffered = [],
      availability,
    } = profile;

    // Save coach_info (similar to nutritionist_info)
    await db.collection("coach_info").doc(uid).set({
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
      gymName,
      offersVirtualConsultation,
      created_on: new Date(),
    });

    // Save coach (similar to nutritionist)
    await db.collection("coach").doc(uid).set({
      id: uid,
      name,
      email,
      accountstatus: "pending",
      created_on: new Date(),
    });

    // Save credentials info
    await db.collection("credentialsCoach").doc(uid).set({
      uid,
      documentType,
      credentialNumber,
      issuingOrganization,
      created_on: new Date(),
    });

    // Save services offered
    await db.collection("servicesCoach").doc(uid).set({
      uid,
      servicesOffered,
      created_on: new Date(),
    });

    // Save availability
    await db.collection("availabilityCoach").doc(uid).set({
      uid,
      availability,
      created_on: new Date(),
    });

    return {
      success: true,
      message: "Coach signup completed successfully",
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Check Email Verification (Coach)
export const checkCoachEmailVerified = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    await reload(userCredential.user);
    return userCredential.user.emailVerified;
  } catch (error) {
    return false;
  }
};