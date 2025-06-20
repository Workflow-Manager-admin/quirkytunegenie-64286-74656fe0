import React, { createContext, useContext, useEffect, useState } from "react";

// ==== Spotify OAuth2 React Logic ====
// Note: For production, the token exchange should be handled by a secure backend to protect the client_secret.
// This frontend implementation uses the "Authorization Code with PKCE" approach, but for the token exchange step, you MUST use a backend to securely exchange the code for a token.

// ---- CONFIGURATION: ----
const SPOTIFY_CLIENT_ID = "9b221db543024cd59839fbb659f346c8";
const REDIRECT_URI = "http://localhost:3000/callback";
const SPOTIFY_AUTHORIZE_ENDPOINT = "https://accounts.spotify.com/authorize";
const SCOPES = [
  "playlist-read-private",
  "playlist-modify-private",
  "playlist-modify-public",
  "user-read-private",
  "user-read-email"
];

// ---- CONTEXT for Auth State ----
const SpotifyAuthContext = createContext();

// PUBLIC_INTERFACE
export function useSpotifyAuth() {
  /** Get current Spotify authentication state and functions. */
  return useContext(SpotifyAuthContext);
}

// PUBLIC_INTERFACE
export function SpotifyAuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(() => {
    // Try to restore from localStorage on refresh
    const stored = window.localStorage.getItem("spotify_access_token");
    return stored ? stored : null;
  });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  // Helper: Random string generator (for PKCE)
  function generateRandomString(length) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let str = "";
    for (let i = 0; i < length; i++)
      str += chars.charAt(Math.floor(Math.random() * chars.length));
    return str;
  }

  // Helper: Base64-urlify
  function toBase64URL(str) {
    return btoa(str)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }

  // Helper: SHA256 (returns Uint8Array)
  // PUBLIC_INTERFACE
  async function sha256(plain) {
    // Plain must be ArrayBuffer or string
    const encoder = new TextEncoder();
    const data = typeof plain === "string" ? encoder.encode(plain) : plain;
    const hash = await window.crypto.subtle.digest("SHA-256", data);
    return new Uint8Array(hash);
  }

  // Helper: PKCE challenge code
  async function generateCodeChallenge(codeVerifier) {
    const hashBin = await sha256(codeVerifier);
    // Convert to base64-url string
    let str = "";
    hashBin.forEach((b) => (str += String.fromCharCode(b)));
    return toBase64URL(str);
  }

  // PUBLIC_INTERFACE
  async function loginWithSpotify() {
    // Start PKCE OAuth2 login
    setAuthError(null);
    setAuthLoading(true);

    const codeVerifier = generateRandomString(128);
    const state = generateRandomString(16);
    window.localStorage.setItem("spotify_pkce_verifier", codeVerifier);
    window.localStorage.setItem("spotify_pkce_state", state);

    // PKCE code challenge
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    const params = new URLSearchParams({
      response_type: "code",
      client_id: SPOTIFY_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      scope: SCOPES.join(" "),
      state,
      code_challenge_method: "S256",
      code_challenge: codeChallenge
    });

    // Redirect to Spotify Login
    window.location = `${SPOTIFY_AUTHORIZE_ENDPOINT}?${params}`;
  }

  // PUBLIC_INTERFACE
  async function handleAuthCallback() {
    // Handles ?code=...&state=... after redirect
    const query = new URLSearchParams(window.location.search);
    const code = query.get("code");
    const returnedState = query.get("state");
    const storedState = window.localStorage.getItem("spotify_pkce_state");
    const codeVerifier = window.localStorage.getItem("spotify_pkce_verifier");

    if (!code || !returnedState || !codeVerifier) {
      setAuthError("Missing parameters in callback.");
      setAuthLoading(false);
      return false;
    }
    if (returnedState !== storedState) {
      setAuthError("OAuth state mismatch. Login cancelled for security.");
      setAuthLoading(false);
      return false;
    }

    // --- IMPORTANT: In a real app, you must POST the code and code_verifier to your backend, which exchanges with Spotify.
    // For demo use ONLY: attempt to exchange in frontend (not secure, exposes client secret in real flow).
    setAuthLoading(true);
    setAuthError(null);

    // NOTE: This WILL NOT WORK in frontend-only apps, as it requires client_secret. You must send to your backend server.
    // We'll show the POST, but comment instructions:
    /*
      POST https://accounts.spotify.com/api/token
      Body (application/x-www-form-urlencoded):
        client_id=...
        grant_type=authorization_code
        code=CODE
        redirect_uri=...
        code_verifier=VERIFIER

      In production, NEVER do this from frontend!
    */
    try {
      const params = new URLSearchParams({
        client_id: SPOTIFY_CLIENT_ID,
        grant_type: "authorization_code",
        code: code,
        redirect_uri: REDIRECT_URI,
        code_verifier: codeVerifier
      });
      const res = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: params
      });
      if (!res.ok) {
        setAuthError("Spotify login failed. (Check backend server for code exchange!)");
        setAuthLoading(false);
        return false;
      }
      const data = await res.json();
      if (data.access_token) {
        setAccessToken(data.access_token);
        window.localStorage.setItem("spotify_access_token", data.access_token);
        setAuthLoading(false);

        // Clean up PKCE details
        window.localStorage.removeItem("spotify_pkce_verifier");
        window.localStorage.removeItem("spotify_pkce_state");

        // Clear callback query params from url
        window.history.replaceState({}, document.title, "/");
        return true;
      } else {
        setAuthError("No access token received from Spotify.");
        setAuthLoading(false);
        return false;
      }
    } catch (e) {
      setAuthError("Spotify OAuth error: " + e.message);
      setAuthLoading(false);
      return false;
    }
  }

  // PUBLIC_INTERFACE
  function logout() {
    setAccessToken(null);
    window.localStorage.removeItem("spotify_access_token");
  }

  // Provide to children:
  return (
    <SpotifyAuthContext.Provider
      value={{
        accessToken,
        isAuthenticated: !!accessToken,
        loginWithSpotify,
        handleAuthCallback,
        logout,
        authLoading,
        authError
      }}
    >
      {children}
    </SpotifyAuthContext.Provider>
  );
}
