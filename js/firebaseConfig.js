import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut 
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCk4qahMKYo6Uu0ThE8-oDWh1Pls7fCIS4",
  authDomain: "anitale-e213e.firebaseapp.com",
  projectId: "anitale-e213e",
  storageBucket: "anitale-e213e.firebasestorage.app",
  messagingSenderId: "105802439634",
  appId: "1:105802439634:web:bb44454842781c83cf460b"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Export Instances & Auth Providers
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Re-export common structural utilities for ease of use across modules
export { signInWithPopup, signOut };