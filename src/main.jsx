import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { initializeFirebaseAnalytics } from "./firebase.js";

void initializeFirebaseAnalytics();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
