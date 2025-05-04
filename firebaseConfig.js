// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC3msB2bQ1H2G6AGqxwubYBi7VRQS5GPrA",
  authDomain: "barber-shop-774f3.firebaseapp.com",
  projectId: "barber-shop-774f3",
  storageBucket: "barber-shop-774f3.firebasestorage.app",
  messagingSenderId: "1050221921551",
  appId: "1:1050221921551:web:35c5d1906d797ed966ea7a",
  measurementId: "G-1THF8QPSR0"
};

// Initialize Firebase with safety checks for SSR
let app;
let auth;
let db;

try {
  // Initialize Firebase
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  // Handling errors that might occur during Firebase initialization
  console.error("Firebase initialization error:", error.message);
  
  // Setting fallbacks to prevent further errors
  if (!app) app = {};
  if (!auth) auth = {};
  if (!db) db = {};
}

export { app, auth, db };