// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
export const firebaseConfig = {
  apiKey: "AIzaSyBC5oFy1sTlKU1FGfdIf0N4lJxN57ocbX0",
  authDomain: "blahblah-477120.firebaseapp.com",
  projectId: "blahblah-477120",
  storageBucket: "blahblah-477120.appspot.com",
  messagingSenderId: "307003980819",
  appId: "1:307003980819:android:blahblah",
};

// Initialize Firebase only if not already initialized
const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

console.log("Firebase initialized:", app.name);

export { app };
