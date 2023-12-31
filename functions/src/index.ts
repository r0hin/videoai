import { onCall, onRequest } from "firebase-functions/v2/https";
import  { user } from "firebase-functions/v1/auth";
import { onObjectFinalized } from "firebase-functions/v2/storage"

import { initializeApp } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import { getMessaging } from "firebase-admin/messaging"
import { getDownloadURL, getStorage } from "firebase-admin/storage"

import axios from "axios";

initializeApp();
const db = getFirestore();
const storage = getStorage();
const messaging = getMessaging();

export const onUserCreated = user().onCreate(async (user) => {
  const uid = user.uid;
  await db.collection("users").doc(uid).set({
    videos: {},
    created: Date.now(),
    credits: 4,
    smootherVideo: false,
  })
  return {success: true}
})

export const submitGeneration = onObjectFinalized({bucket: "videoai-1.appspot.com", secrets: ["REPLICATE_KEY"]}, async (object) => {
  const path = object.data.name;

  if (path.includes("outputs")) {
    return {success: false, error: "already generated"}
  }

  const uid = path.split("/")[0];
  const videoId = path.split("/")[1];

  if (object.data.size < 1000) { // Less than 1kb
    return {success: false, error: "too small"}
  }

  const userDoc = await db.collection("users").doc(uid).get();
  let creditsToDeduct = 1;
  if (userDoc.data()?.smootherVideo) {
    creditsToDeduct = 2;
  }

  if (userDoc.data()?.credits < creditsToDeduct) {
    return {success: false, error: "no credits"}
  }
  else {
    await db.collection("users").doc(uid).set({
      credits: userDoc.data()?.credits - creditsToDeduct
    }, {merge: true})
  }

  db.collection("users").doc(uid).set({
    videos: {
      [videoId]: {
        status: "generating"
      }
    }
  }, {merge: true})

  const bucket = storage.bucket(object.bucket);
  const file = bucket.file(path);
  const url = await getDownloadURL(file);

  const options = {
    method: 'POST',
    url: 'https://api.replicate.com/v1/predictions',
    headers: {
      Authorization: `Token ${process.env.REPLICATE_KEY}`,
      'Content-Type': 'application/json'
    },
    data: {
      version: "3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438",
      input: {
        input_image: url,
        frames_per_second: creditsToDeduct === 1 ? 6 : 11,
        video_length: creditsToDeduct === 1 ? "14_frames_with_svd" : "25_frames_with_svd_xt",
      },
      webhook: `https://ongenerationcomplete-j5kiq2vqqq-uc.a.run.app?uid=${uid}&videoId=${videoId}`,
      webhook_events_filter: ['completed']
    }
  };
  
  axios.request(options).then(function (response) {
    console.log(response.data);
  }).catch(function (error) {
    console.error(error);
  });

  return {success: true}
})

export const setSmooth = onCall(async (request) => {
  const smooth = request.data.smooth;
  const uid = request.auth?.uid || "";

  await db.collection("users").doc(uid).set({
    smootherVideo: smooth
  }, {merge: true})
})

export const onGenerationComplete = onRequest({}, async (request, response) => {
  const videoURL = request.body.output;
  const uid = request.query.uid || "none";
  const videoId = request.query.videoId || "none";

  const bucket = storage.bucket("videoai-1.appspot.com");
  const file = bucket.file(`${uid}/outputs/${`${videoId}`.split(".")[0]}.mp4`);
  const writeStream = file.createWriteStream();
  const res = await axios.get(videoURL, {responseType: "stream"});
  await res.data.pipe(writeStream);

  // Update firestore
  await db.collection("users").doc(`${uid}`).set({
    videos: {
      [`${videoId}`]: {
        status: "complete"
      }
    }
  }, {merge: true})

  try {
    const tokenDoc = await db.collection("token").doc(`${uid}`).get();
    const token = tokenDoc.data()?.token;
  
    if (token) {
      const message = {
        notification: {
          title: "Your video has finished generating!",
        },
        token: token
      }
    
      await messaging.send(message);
    }
  } catch (error) { }

  response.status(200).send("ok");
});

export const onPaymentSuccess = onRequest({}, async (request, response) => {
  const userID = request.body.event.original_app_user_id;
  const header = request.headers.authorization;

  if (header !== "Bearer 30nn") {
    response.status(403).send("Invalid auth header");
    return;
  }

  const userDoc = await db.collection("users").doc(userID).get();
  await db.collection("users").doc(userID).set({
    credits: userDoc.data()?.credits + 8
  }, {merge: true})

  try {
    const tokenDoc = await db.collection("token").doc(userID).get();
    const token = tokenDoc.data()?.token;
  
    if (token) {
      const message = {
        notification: {
          title: "Your credits are added!",
        },
        token: token
      }
    
      await messaging.send(message);
    } 
  } catch (error) { }

  response.status(200).send("ok")
});