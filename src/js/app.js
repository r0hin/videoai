import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

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
  setDoc(doc(db, `token/${user.uid}`), {
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

window.mobileAndTabletCheck = function() {
  let check = false;
  (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
  return check;
};

updateDarkLight();
// Listener
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateDarkLight);
function updateDarkLight() {
  if (window.matchMedia('(prefers-color-scheme: dark)').matches && mobileAndTabletCheck()) {
    $(`body`).addClass('dark')
  } else {
    $(`body`).removeClass('dark')
  }
}

export function getStarted() {
  try { listener() } catch (error) { }
  listener = onSnapshot(doc(db, `users/${user.uid}`), (doc) => {
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
      a.innerHTML = `
        <div style="display: flex; flex-direction: row; align-items: center; justify-content: space-between;">
          <div>
            <b>${timeago.format(dateObject)}</b>
            ${value.status !== "complete" ? `<div style="font-size: 12px">This shouldn't take longer than a minute.</div>` : ``}
          </div>
          <div>
            ${value.status == "complete" ? `<button id="open-modal-${dateObject.getTime()}">Open</button> <button style="margin-left: 8px;" id="share-${dateObject.getTime()}">Share</button>` : `<ion-spinner></ion-spinner>`}
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