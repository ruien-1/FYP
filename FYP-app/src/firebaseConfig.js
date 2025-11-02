import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore } from "firebase/firestore"; 

const firebaseConfig = {
  apiKey: "AIzaSyBp3G6SiXKuIt3GPG_8KQ2xNROUEGfUZmI",
  authDomain: "fyp-app-744cd.firebaseapp.com",
  projectId: "fyp-app-744cd",
  storageBucket: "fyp-app-744cd.firebasestorage.app",
  messagingSenderId: "312637946834",
  appId: "1:312637946834:web:50ac52848c3735f992660b"
};


const app = initializeApp(firebaseConfig);

const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});

const db = getFirestore(app);

export { auth, db };
