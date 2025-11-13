import {
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../config/firebase";

// Sign Up Function
export const signUp = async (email, password, displayName) => {
  try {
    console.log("🔐 [SIGNUP] Starting sign up for:", email);

    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;
    console.log("✅ [SIGNUP] User created in Firebase Auth:", user.uid);

    console.log("📝 [SIGNUP] Saving to Firestore...");
    await setDoc(doc(db, "users", user.uid), {
      email: user.email,
      displayName: displayName,
      role: "citizen",
      createdAt: new Date(),
      reportsCount: 0,
    });
    console.log("✅ [SIGNUP] User profile saved to Firestore");

    return { user, error: null };
  } catch (error) {
    console.error("❌ [SIGNUP] Error:", error.code, error.message);
    return { user: null, error: getAuthErrorMessage(error.code) };
  }
};

// Sign In Function
export const signIn = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    return { user: userCredential.user, error: null };
  } catch (error) {
    return { user: null, error: getAuthErrorMessage(error.code) };
  }
};

// Sign Out Function
export const signOut = async () => {
  try {
    console.log("🔓 [LOGOUT] Signing out from Firebase...");
    await firebaseSignOut(auth);
    console.log("✅ [LOGOUT] Successfully signed out from Firebase");
    console.log("🔄 [LOGOUT] Auth state should trigger redirect to signin...");
    return { error: null };
  } catch (error) {
    console.error("❌ [LOGOUT] Sign out error:", error.code, error.message);
    return { error: error.message };
  }
};

// Get Current User
export const getCurrentUser = () => {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        unsubscribe();
        resolve(user);
      },
      reject
    );
  });
};

// Get User Profile Data
export const getUserProfile = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (userDoc.exists()) {
      return userDoc.data();
    }
    return null;
  } catch (error) {
    console.error("Error getting user profile:", error);
    return null;
  }
};

// Enhanced error messages
const getAuthErrorMessage = (errorCode) => {
  switch (errorCode) {
    case "auth/email-already-in-use":
      return "This email is already registered. Please sign in instead.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/weak-password":
      return "Password should be at least 6 characters.";
    case "auth/user-not-found":
      return "No account found with this email.";
    case "auth/wrong-password":
      return "Incorrect password. Please try again.";
    case "auth/too-many-requests":
      return "Too many failed attempts. Please try again later.";
    default:
      return "An error occurred. Please try again.";
  }
};
