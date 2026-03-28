import { onRequest } from "firebase-functions/v2/https";

process.env.SERVER_MODE = "function";
const { app } = await import("./server/index.js");

export const api = onRequest({ region: "us-central1", cors: true }, app);
