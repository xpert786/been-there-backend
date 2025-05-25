// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBS83Yi2RBuRyRc_t2qey1bNMhG6fxxc1A",
  authDomain: "travel-around-ec840.firebaseapp.com",
  projectId: "travel-around-ec840",
  storageBucket: "travel-around-ec840.firebasestorage.app",
  messagingSenderId: "1050919447778",
  appId: "1:1050919447778:web:6877fad7ad95af6a0182bb",
  measurementId: "G-M5553SVR6V"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);