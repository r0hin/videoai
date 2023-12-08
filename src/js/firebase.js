import { FirebaseAuthentication } from "@capacitor-firebase/authentication";
import { initializeApp, getApp, getApps } from "firebase/app";
import { OAuthProvider, getAuth, indexedDBLocalPersistence, initializeAuth, onAuthStateChanged, signInWithCredential } from 'firebase/auth';

window.user = null;

if (!getApps().length) {
  const firebaseConfig = {
    apiKey: "AIzaSyAhGnEwmT_O2408435H9W5ai-5IcIZ4YFM",
    authDomain: "videoai-0.firebaseapp.com",
    projectId: "videoai-0",
    storageBucket: "videoai-0.appspot.com",
    messagingSenderId: "1016068753715",
    appId: "1:1016068753715:web:08eba0c116327b277ad646"
  };
  initializeApp(firebaseConfig);
}

const getFirebaseAuth = async () => {
  if (Capacitor.isNativePlatform()) {
    return initializeAuth(getApp(), {
      persistence: indexedDBLocalPersistence,
    });
  } else {
    return getAuth();
  }
};

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
  const auth = getAuth();
  await signInWithCredential(auth, credential);
};

onAuthStateChanged(getAuth(), (user) => {
  window.user = user;
  if (user) {
    $(`#signedIn`).removeClass(`hidden`);
    $(`#signedOut`).addClass(`hidden`);
  } else {
    $(`#signedIn`).addClass(`hidden`);
    $(`#signedOut`).removeClass(`hidden`);
  }
});

$(`#signInAppleButton`).on('click', signInWithApple);