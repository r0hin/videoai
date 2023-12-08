import { onRequest } from "firebase-functions/v2/https";
import { onObjectFinalized } from "firebase-functions/v2/storage"

export const submitGeneration = onObjectFinalized({bucket: "videoai-0.appspot.com", secrets: ["REPLICATE_KEY"]}, (object) => {
  const path = object.data.name;
  console.log(path, process.env.REPLICATE_KEY)
})

export const onGenerationComplete = onRequest({}, (request, response) => {
  response.send("OK");
});
