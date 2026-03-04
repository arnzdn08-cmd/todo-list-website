// ============================================
// FIREBASE SHARED CONFIG
// Import this in any page that needs Firebase
// ============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.6.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDYbdoeIZpxgya0ktpRrcOqtJBz8Y3oNNI",
  authDomain: "todoapp-74fd3.firebaseapp.com",
  projectId: "todoapp-74fd3",
  storageBucket: "todoapp-74fd3.firebasestorage.app",
  messagingSenderId: "640734898506",
  appId: "1:640734898506:web:5b5046336c2339f01e79b3"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);