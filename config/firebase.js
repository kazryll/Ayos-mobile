// config/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBAkWQ7Hh-CXh4hBSj3jseo2nmxtnZfRg0",
  authDomain: "ayos-f5dcb.firebaseapp.com",
  projectId: "ayos-f5dcb",
  storageBucket: "ayos-f5dcb.firebasestorage.app",
  messagingSenderId: "480814117517",
  appId: "1:480814117517:web:167d0a2125237e0029a8c4",
  measurementId: "G-YFKH03T81E",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;
