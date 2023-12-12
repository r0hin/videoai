import { doc, getDoc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { httpsCallable } from "firebase/functions";

import { toastController } from "@ionic/core";
import * as timeago from "timeago.js"

import { Purchases } from '@revenuecat/purchases-capacitor';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';

if (!window.offerings) {
  window.offerings = null
}

export async function setupNotifications() {
  await FirebaseMessaging.removeAllDeliveredNotifications();

  let result = await FirebaseMessaging.checkPermissions();
  if (result.receive == "prompt") {
    result = await FirebaseMessaging.requestPermissions();
  }
  else if (result.receive == "denied") {
    return;
  }

  const token = await FirebaseMessaging.getToken();
  await setDoc(doc(db, `token/${user.uid}`), {
    token: token.token,
  })
}

export async function loadRevenueCat() {
  await Purchases.configure({
    apiKey: "appl_DbQVhTWrYVbIdESVBjjyzqlbucG",
    appUserID: user.uid,
  });

  offerings = await Purchases.getOfferings();

  const creditPackage = offerings.current.availablePackages[0];
  $(`#addCreditButton`).html(`Add 8 More? (${creditPackage.product.priceString})`)

  console.log(offerings)
}

$(`#addCreditButton`).get(0).onclick = async () => {
  console.log(offerings)
  const purchaseResult = await Purchases.purchasePackage({
    aPackage: offerings.current.availablePackages[0]
  })

  console.log(purchaseResult)
}

$(`#filePicker`).get(0).onchange = async (e) => {
  console.log("Changed!")
  const userDoc = await getDoc(doc(db, `users/${user.uid}`));
  console.log(userDoc.data())
  if (userDoc.data().credits <= 0) {
    const toast = await toastController.create({
      message: `You don't have enough credits!`,
      duration: 1500,
      position: "top",
    });

    await toast.present();
    return;
  }

  $(`.uploadPhotoButton`).addClass(`hidden`);
  $(`#loader`).removeClass(`hidden`);
  const file = e.target.files[0];
  console.log('hi')

  // Convert to jpeg
  const blob = await new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement(`canvas`);
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext(`2d`);
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(resolve, `image/jpeg`);
    };
    img.src = URL.createObjectURL(file);
  })

  // Image is
  const iamge = new File([blob], `image.jpeg`, {
    type: `image/jpeg`,
  });

  const dateString = Date.now();
  console.log(dateString)

  // Upload to Firebase Storage
  const placement = ref(storage, `${user.uid}/${dateString}.jpg`);
  await uploadBytes(placement, iamge);

  console.log("Done.")
  $(`#loader`).addClass(`hidden`);
  $(`.uploadPhotoButton`).removeClass(`hidden`);
  const toast = await toastController.create({
    message: `Uploaded successfully! Processing...`,
    duration: 1500,
    position: "top",
  });

  await toast.present();
}

$(`#uploadPhotoButton`).get(0).onclick = () => {
  $(`#filePicker`).get(0).value = null;
  $(`#filePicker`).get(0).accept = `image/*`;
  // Set files to empty
  $(`#filePicker`).get(0).files = null;


  $(`#filePicker`).get(0).click();
}


window.listener = null;

window.macosCheck = function() {
  try {
    return (navigator.platform || navigator.userAgentData.platform).indexOf('Mac') > -1.
  } catch (error) {
    return false
  }
};

updateDarkLight();
// Listener
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateDarkLight);
function updateDarkLight() {
  console.log(macosCheck())

  if (window.matchMedia('(prefers-color-scheme: dark)').matches && !macosCheck()) {
    $(`body`).addClass('dark')
  } else {
    $(`body`).removeClass('dark')
  }
}

export function getStarted() {
  try { listener() } catch (error) { }
  listener = onSnapshot(doc(db, `users/${user.uid}`), (doc) => {
    if ($(`#smootherVideoToggle`).get(0).checked != doc.data().smootherVideo) {
      $(`#smootherVideoToggle`).get(0).checked = doc.data().smootherVideo || false;
    }
    $(`#creditCount`).html(doc.data().credits)
    $(`#videolist`).empty();
    const videos = doc.data().videos;

    if (!videos || Object.keys(videos).length == 0) {
      $(`#videolist`).html(`<center>No videos!</center>`);
      return;
    }

    const keys = Object.keys(videos).sort((a, b) => {
      return Number(a.split(`.`)[0]) - Number(b.split(`.`)[0]);
    })
  
    keys.reverse().forEach((videoId) => {
      const a = document.createElement('div');
      const value = videos[videoId];
      a.classList.add("card");
      const date = Number(videoId.split(`.`)[0]);
      const dateObject = new Date(date);

      let old = true;
      // if within last 3 minutes
      if (Date.now() - date < 1000 * 60 * 3) {
        old = false;
      }
      
      a.innerHTML = `
        <div style="display: flex; flex-direction: row; align-items: center; justify-content: space-between;">
          <div>
            <b>${timeago.format(dateObject)}</b>
            ${value.status !== "complete" ? `<div style="font-size: 12px">${old ? "Contact me on X if you want credits refunded!" : "This shouldn't take longer than a minute."}</div>` : ``}
          </div>
          <div>
            ${(value.status == "complete") ? `<button id="open-modal-${dateObject.getTime()}">Open</button> <button style="margin-left: 8px;" id="share-${dateObject.getTime()}">Share</button>` : `${old ? "Failed!" : "<ion-spinner></ion-spinner>"}`}
          </div>
        </div>
        <div id="expandable-${dateObject.getTime()}" class="hidden videoContainer">
          <video id="previewElement" class="videoShowing"></video>
        </div>
      `
      $(`#videolist`).append(a);
      
      if (value.status == "complete") {
        $(`#open-modal-${dateObject.getTime()}`).get(0).onclick = async () => {
          $(`#expandable-${dateObject.getTime()}`).toggleClass(`hidden`);
          if ($(`#expandable-${dateObject.getTime()}`).hasClass(`hidden`)) {
            $(`#open-modal-${dateObject.getTime()}`).html(`Open`);
            $(`#previewElement`).get(0).pause();
            return;
          }
          $(`#open-modal-${dateObject.getTime()}`).html(`Close`);
          const downloadURL = await getDownloadURL(ref(storage, `${user.uid}/outputs/${videoId.split(`.`)[0]}.mp4`));
          $(`#previewElement`).get(0).src = downloadURL;
          $(`#previewElement`).get(0).play();
        }

        $(`#share-${dateObject.getTime()}`).get(0).onclick = async () => {
          const downloadURL = await getDownloadURL(ref(storage, `${user.uid}/outputs/${videoId.split(`.`)[0]}.mp4`));
          const shareData = {
            title: `AI Generated Video`,
            text: `Check out this video I made with VideoAI!`,
            url: downloadURL,
          }
          try {
            await navigator.share(shareData);
          } catch (error) {
            console.log(error)
          }
        }
      }
    })
  });
}

$(`#aboutButton`).get(0).onclick = async () => {
  const alert = document.createElement('ion-alert');
  alert.header = 'About VideoAI';
  alert.message = `VideoAI is a photo to video app that uses open-source AI models to automatically intelligently turn your photos into smooth videos! This is primarily based on StabilityAI's Stable Video Diffiusion (stability-ai/stable-video-diffusion) research paper.`;
  alert.buttons = ['Cool!'];

  document.body.appendChild(alert);
  await alert.present();
}

$(`#smootherVideoToggle`).get(0).addEventListener(`ionChange`, async () => {
  if (!localStorage.getItem("notFirstTime") && $(`#smootherVideoToggle`).get(0).checked) {
    const alert = document.createElement('ion-alert');
    alert.header = '🎉 Smoother Video';
    alert.message = `We will generate videos with ~80% more frames at ~83% more FPS! Warning that each generation will use 2 credits.`;
    alert.buttons = ['Cool!'];
  
    document.body.appendChild(alert);
    await alert.present();   
    localStorage.setItem("notFirstTime", true)
  }

  const setSmooth = httpsCallable(functions, "setSmooth")
  await setSmooth({
    smooth: $(`#smootherVideoToggle`).get(0).checked,
  })
});