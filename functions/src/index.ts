import { onRequest } from "firebase-functions/v2/https";
import  { user } from "firebase-functions/v1/auth";
import { onObjectFinalized } from "firebase-functions/v2/storage"

import { initializeApp } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import { getDownloadURL, getStorage } from "firebase-admin/storage"

import axios from "axios";

initializeApp();
const db = getFirestore();
const storage = getStorage();

export const onUserCreated = user().onCreate(async (user) => {
  const uid = user.uid;
  await db.collection("users").doc(uid).set({
    videos: {},
    created: Date.now()
  })
  return {success: true}
})

export const submitGeneration = onObjectFinalized({bucket: "videoai-1.appspot.com", secrets: ["REPLICATE_KEY"]}, async (object) => {
  const path = object.data.name;
  console.log(path, process.env.REPLICATE_KEY)

  if (path.includes("outputs")) {
    return {success: false, error: "already generated"}
  }

  const uid = path.split("/")[0];
  const videoId = path.split("/")[1];

  const userDoc = await db.collection("users").doc(uid).get();
  if (userDoc.data()?.credits <= 0) {
    return {success: false, error: "no credits"}
  }
  else {
    await db.collection("users").doc(uid).set({
      credits: userDoc.data()?.credits - 1
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
        input_image: url
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

export const onGenerationComplete = onRequest({}, async (request, response) => {
  const videoURL = request.body.output;
  const uid = request.query.uid || "none";
  const videoId = request.query.videoId || "none";

  console.log(videoURL, uid, videoId)

  // Download video and upload to storage
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

  response.status(200).send("ok");
});
