import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from "./App";
import "./index.css";
import { Toaster } from "sonner";

// Replace with your actual Google Client ID (this is a placeholder)
const GOOGLE_CLIENT_ID = "your-google-client-id.apps.googleusercontent.com";

createRoot(document.getElementById("root")!).render(
  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <App />
    <Toaster position="top-right" richColors />
  </GoogleOAuthProvider>
);
