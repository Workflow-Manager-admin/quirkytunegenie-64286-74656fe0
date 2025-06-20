import React, { useEffect } from 'react';
import { useSpotifyAuth } from './SpotifyAuth';
import { useLocation, useNavigate } from 'react-router-dom';

// PUBLIC_INTERFACE
export function SpotifyAuthCallbackRoute() {
  const { handleAuthCallback, authLoading, authError } = useSpotifyAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Run callback handler if code is in query
    if (location.pathname === '/callback') {
      (async () => {
        const success = await handleAuthCallback();
        if (success) {
          // Redirect away from /callback to home after login
          navigate("/", {replace: true});
        }
      })();
    }
    // eslint-disable-next-line
  }, [location]);

  return (
    <div style={{ padding: 40, textAlign: 'center', minHeight: '50vh' }}>
      <h2>Connecting to Spotify...</h2>
      {authLoading ? <div>Authorizing, please wait...</div> : null}
      {authError ? <div style={{ color: '#d22', marginTop: 16 }}>{authError}</div> : null}
    </div>
  );
}

// PUBLIC_INTERFACE
export function SpotifyLoginButton() {
  const { loginWithSpotify, isAuthenticated, logout, accessToken, authLoading, authError } = useSpotifyAuth();

  if (isAuthenticated) {
    return (
      <div style={{ display:'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <span style={{ color: '#22a055', fontWeight: 600 }}>Spotify Connected</span>
        <button className="btn" style={{ background: '#E87A41', color: '#fff' }} onClick={logout}>
          Logout Spotify
        </button>
      </div>
    );
  }
  return (
    <div>
      <button className="btn" style={{ background: '#4A90E2', color: '#fff', marginBottom: 8 }} onClick={loginWithSpotify} disabled={authLoading}>
        {authLoading ? "Connecting..." : "Login with Spotify"}
      </button>
      {authError && (
        <div style={{ color: "#a00", marginTop: 8 }}>{authError}</div>
      )}
    </div>
  );
}
