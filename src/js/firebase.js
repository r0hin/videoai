import { FirebaseAuthentication } from "@capacitor-firebase/authentication";
import { initializeApp, getApp, getApps } from "firebase/app";
import { OAuthProvider, getAuth, indexedDBLocalPersistence, initializeAuth, onAuthStateChanged, signInWithCredential } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getStarted } from "./app";

window.user = null;
window.storage = null;
window.db = null;

const getFirebaseAuth = async () => {
  if (Capacitor.isNativePlatform()) {
    return initializeAuth(getApp(), {
      persistence: indexedDBLocalPersistence,
    });
  } else {
    return getAuth();
  }
};


if (!getApps().length) {
  const firebaseConfig = {
    apiKey: "AIzaSyDQ6suyjxHWnehNjZqqfdpWrVjQUteaKLY",
    authDomain: "videoai-1.firebaseapp.com",
    projectId: "videoai-1",
    storageBucket: "videoai-1.appspot.com",
    messagingSenderId: "329236993600",
    appId: "1:329236993600:web:59abbc58515f1284dcb1a5"
  };
  initializeApp(firebaseConfig);

  onAuthStateChanged(await getFirebaseAuth(), (user) => {
    window.user = user;
    if (user) {
      $(`#signedIn`).removeClass(`hidden`);
      $(`#signedOut`).addClass(`hidden`);
      getStarted();
    } else {
      $(`#signedIn`).addClass(`hidden`);
      $(`#signedOut`).removeClass(`hidden`);
    }
  });
}

window.storage = getStorage();
window.db = getFirestore();

const signInWithApple = async () => {
  // 1. Create credentials on the native layer
  const result = await FirebaseAuthentication.signInWithApple({
    skipNativeAuth: true,
  });
  // 2. Sign in on the web layer using the id token and nonce
  const provider = new OAuthProvider('apple.com');
  const credential = provider.credential({
    idToken: result.credential?.idToken,
    rawNonce: result.credential?.nonce,
  });
  const auth = await getFirebaseAuth();
  await signInWithCredential(auth, credential);
};

$(`#signInAppleButton`).on('click', signInWithApple);