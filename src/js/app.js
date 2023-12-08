import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

import { toastController } from "@ionic/core";
import * as timeago from "timeago.js"

import 'cordova-plugin-purchase';

const { store, ProductType, Platform } = CdvPurchase;
store.register([{
  type: ProductType.CONSUMABLE,
  id: "credits1",
  platform: Platform.APPLE_APPSTORE
}])

updateUI();
window.setTimeout(() => {
  updateUI();
}, 5000)
function updateUI() {
  const {store, Platform} = CdvPurchase;
  console.log(store.products)
  const creditsProduct = store.get('credits1', Platform.APPLE_APPSTORE);
  if (creditsProduct) {
    console.log(creditsProduct.title)
    $(`#buy1`).get(0).innerHTML = `Add ${creditsProduct.title} (${creditsProduct.price})`;
  }
}

function finishPurchase() {

}

$(`#addCreditButton`).get(0).onclick = () => {
}

$(`#closePurchasesModal`).get(0).onclick = () => {
  $(`#modal-purchases`).get(0).dismiss()
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
  $(`#filePicker`).get(0).click();
}

$(`#filePicker`).on(`click`, () => {
  $(`#filePicker`).get(0).value = null;
})

window.listener = null;

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
        <ion-modal id="modal-${dateObject.getTime()}" trigger="open-modal-${dateObject.getTime()}">
          <ion-header>
            <ion-toolbar>
              <ion-title>Preview</ion-title>
              <ion-buttons slot="end">
                <ion-button id="closeModal-${dateObject.getTime()}">Close</ion-button>
              </ion-buttons>
            </ion-toolbar>
          </ion-header>
          <ion-content class="videoContainer" id="content-${dateObject.getTime()}">
            
          </ion-content>
        </ion-modal>
        <div>
          <b>${timeago.format(dateObject)}</b>
          ${value.status !== "complete" ? `<div style="font-size: 12px">This shouldn't take longer than a minute.</div>` : ``}
        </div>
        <div>
          ${value.status == "complete" ? `
            <button id="open-modal-${dateObject.getTime()}">Open</button>
          ` : `<ion-spinner></ion-spinner>`}
        </div
      `
      $(`#videolist`).append(a);

      
      if (value.status == "complete") {
        const modal = document.getElementById(`modal-${dateObject.getTime()}`);

        $(`#closeModal-${dateObject.getTime()}`).get(0).onclick = () => {
          modal.dismiss();
        }
        
        $(`#open-modal-${dateObject.getTime()}`).get(0).onclick = async () => {
          const downloadURL = await getDownloadURL(ref(storage, `${user.uid}/outputs/${videoId.split(`.`)[0]}.mp4`));
          window.open(downloadURL, "blank")
          $(`#content-${dateObject.getTime()}`).html(`
            <video class="videoShowing" src="${downloadURL}" controls></video>
            <center>
              <button id="shareButton-${dateObject.getTime()}">Share</button>
            </center>
          `)
          $(`#shareButton-${dateObject.getTime()}`).get(0).onclick = () => {
            navigator.share({
              title: "AI Generated Video",
              text: "Check out this video I made with VideoAI!",
              url: downloadURL,
            })
          }
        }
      }
    })


  });
}
