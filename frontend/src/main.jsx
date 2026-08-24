import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import "./index.css";

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  "331318786154-mvj2jh9srtnt168osaaff3759ksjec4f.apps.googleusercontent.com";

const Root = (
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

// If Google sign-in isn't configured yet, skip the provider entirely rather
// than let @react-oauth/google throw on a missing client ID — email/password
// auth still works fine without it.
ReactDOM.createRoot(document.getElementById("root")).render(
  GOOGLE_CLIENT_ID ? (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>{Root}</GoogleOAuthProvider>
  ) : (
    Root
  )
);
