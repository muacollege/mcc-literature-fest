
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAUMF1IB56iUpj3A9I6pabeLTaFIsGjP88",
  authDomain: "mcc-literature-fest.firebaseapp.com",
  projectId: "mcc-literature-fest",
  storageBucket: "mcc-literature-fest.firebasestorage.app",
  messagingSenderId: "259384063570",
  appId: "1:259384063570:web:cd272f1902b9b78f68118b"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
