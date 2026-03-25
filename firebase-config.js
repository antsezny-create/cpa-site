// ══════════════════════════════════════
//  FIREBASE CONFIG
//  Include this file on every page that
//  needs authentication or database access.
//  Load the Firebase CDN scripts BEFORE this file.
// ══════════════════════════════════════
const firebaseConfig = {
  apiKey: "AIzaSyApBl6CcUwGaRij3y9IIwJWuzLhhII_ZLw",
  authDomain: "sesny-cpa.firebaseapp.com",
  projectId: "sesny-cpa",
  storageBucket: "sesny-cpa.firebasestorage.app",
  messagingSenderId: "900448097937",
  appId: "1:900448097937:web:7fe249108afc3d7078d130"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Create references we'll use everywhere
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// ══════════════════════════════════════
//  APP CHECK — protects Firestore/Storage from unauthorized direct access
//  If auth breaks after re-enabling, verify the reCAPTCHA v3 site key
//  in the Firebase Console matches the one below.
// ══════════════════════════════════════
const appCheck = firebase.appCheck();
appCheck.activate('6LeehI8sAAAAAAq-yH2lumGxyGsWsSg8dD8QZHDi', true);