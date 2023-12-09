import { FirebaseAuthentication } from "@capacitor-firebase/authentication";
import { initializeApp, getApp, getApps } from "firebase/app";
import { OAuthProvider, getAuth, indexedDBLocalPersistence, initializeAuth, onAuthStateChanged, signInWithCredential } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getStarted, loadRevenueCat, setupNotifications } from "./app";
import { toastController } from "@ionic/core";

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

window.listener = null;

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

  setListener();  
}

$(`#refreshButton`).get(0).onclick = async () => {
  startRefresh();
}

async function startRefresh() {
  console.log("refreshing")
  const toast = await toastController.create({
    message: `Refreshed!`,
    duration: 1500,
    position: "top",
  });

  await toast.present();

  setListener();
  $(`#refreshButton`).get(0).onclick = () => { }
  window.setTimeout(() => {
    $(`#refreshButton`).get(0).onclick = async () => {
      startRefresh();
    }
  }, 2999)
}

async function setListener() {
  try { listener() } catch (error) { }
  listener = onAuthStateChanged(await getFirebaseAuth(), (user) => {
    window.user = user;
    if (user) {
      $(`#signedIn`).removeClass(`hidden`);
      $(`#signedOut`).addClass(`hidden`);
      loadRevenueCat();
      getStarted();
      setupNotifications();
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

$(`#signOut`).get(0).onclick = async () => {
  await (await getFirebaseAuth()).signOut();
  FirebaseAuthentication.signOut();
  setListener();
}

$(`#deleteButton`).get(0).onclick = async () => {
  // Need to reuathenticate
  const deleteAlert = document.createElement('ion-alert');
  deleteAlert.header = 'Delete Account';
  deleteAlert.message = `Are you sure you want to delete your account? Note: For security purposes, you must have signed in recently. If you haven't, please sign out and sign back in.`;
  deleteAlert.buttons = [{
    text: "Delete 💔",
    role: "destructive",
    handler: async () => {
      try {
        await user.delete();
        alert("😿 Your account has been deleted. Your videos, credits, and details are lost. You can complete this process by deleting VideoAI from your Sign in with Apple settings.")
      } catch (error) {
        alert(error.message.split(`Firebase:`)[1]);
        alert("We're signing you. Please try again.")
      }
      (await getFirebaseAuth()).signOut();
    },
  }, {
    text: "Stay ❤️",
    role: "cancel",
    handler: () => {
      alert("Your account is safe 😌")
    }
  }];
  document.body.appendChild(deleteAlert);
  deleteAlert.present()
}