// config/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBqVUfTUoxRuV5L5EJTRB-TX9knD33UvYk",
  authDomain: "ayos-lgu-web-app.firebaseapp.com",
  projectId: "ayos-lgu-web-app",
  storageBucket: "ayos-lgu-web-app.firebasestorage.app",
  messagingSenderId: "183096564899",
  appId: "1:183096564899:web:6f2c38a5415e786519f316",
  measurementId: "G-5TBPP3SXDN"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;
