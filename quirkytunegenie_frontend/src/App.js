import React, { useState, useEffect } from 'react';
import './App.css';
import { SpotifyAuthProvider, useSpotifyAuth } from './SpotifyAuth';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// ==== COLOR THEME: ====
const COLORS = {
  primary: '#4A90E2',
  secondary: '#50E3C2',
  accent: '#F5A623',
  backgroundLight: '#FAFAFA',
  background: '#ffffff',
  text: '#212121',
  sectionBg: '#f5faff'
};

// Helper: Generate a simple music "genome" by hashing all inputs
function generateMusicGenome(inputs) {
  // Placeholder: simple "hash" via string join and charCode sum.
  const raw = Object.values(inputs).join('|');
  let hash = 0;
  for (let i = 0; i < raw.length; i++) hash = (hash + raw.charCodeAt(i) * (i + 1)) % 1000000;
  // For demo, turn to "genome" profile
  const moods = ['Chill', 'Energetic', 'Dreamy', 'Nostalgic', 'Eccentric', 'Bold', 'Mellow'];
  const colors = ['Blue', 'Orange', 'Green', 'Purple', 'Yellow', 'Pink', 'Aqua'];
  return {
    genomeId: hash,
    mood: moods[hash % moods.length],
    toneColor: colors[(hash + 3) % colors.length],
    weirdness: (hash % 10) + 1
  };
}

// Helper: LOCAL profile storage (simulate with localStorage)
function saveProfile(profile) {
  localStorage.setItem('qtg_profile_current', JSON.stringify(profile));
}
function loadProfile() {
  const p = localStorage.getItem('qtg_profile_current');
  return p ? JSON.parse(p) : null;
}

// Helper: (Partial, Demo) Spotify playlist creation, not full OAuth flow
async function fetchSpotifyPlaylist(genome, setStatus, setPlaylist) {
  // As we lack real Spotify user/OAuth, we use Spotify's public search API for demo.
  // Real app: use OAuth, get access token, use /v1/recommendations + /v1/users/{id}/playlists
  setStatus('Fetching song suggestions...');
  try {
    // "Seed" search by combining genome characteristics
    const q = [genome.mood, genome.toneColor, genome.weirdness, 'music'].join(' ');
    const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=8`;

    // Pseudo-access token for demo purposes
    // Real: obtain with OAuth flow
    // DEMO NOTE: This will not work unless the user provides a valid token client-side.
    const token = window.__SPOTIFY_TOKEN__ || ''; // Place a valid token in window for demo

    if (!token) {
      setStatus('Demo: Please provide a valid Spotify token in window.__SPOTIFY_TOKEN__ for real results.');
      setPlaylist([]);
      return;
    }

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.status !== 200) {
      setStatus('Failed to fetch from Spotify (check token).');
      setPlaylist([]);
      return;
    }
    const data = await res.json();
    const tracks = data.tracks.items.slice(0, 8).map(t => ({
      name: t.name,
      artist: t.artists.map(a => a.name).join(', '),
      album: t.album.name,
      url: t.external_urls.spotify,
      albumArt: t.album.images[1]?.url || t.album.images[0]?.url
    }));
    setPlaylist(tracks);
    setStatus('');
  } catch (err) {
    setStatus('Error contacting Spotify.');
    setPlaylist([]);
  }
}

import { SpotifyLoginButton } from './AuthIntegrationUI';

// ==== MAIN CONTAINER ====
function QuirkyTuneGenieContainer() {
  // User Inputs
  const [inputs, setInputs] = useState({
    favoriteSmell: '',
    moodAfterIceCream: '',
    nostalgicColor: '',
    currentMoodAnimal: '',
    recentDream: ''
  });

  // App State
  const [musicGenome, setMusicGenome] = useState(null);
  const [profile, setProfile] = useState(loadProfile());
  const [spotifyPlaylist, setSpotifyPlaylist] = useState([]);
  const [spotifyStatus, setSpotifyStatus] = useState('');
  const [processing, setProcessing] = useState(false);

  // Handlers
  const handleInputChange = e => {
    setInputs({ ...inputs, [e.target.name]: e.target.value });
  };

  // PUBLIC_INTERFACE
  function handleGenerateGenome(e) {
    e.preventDefault();
    setProcessing(true);
    setTimeout(() => {
      // Process input to create music genome
      const genome = generateMusicGenome(inputs);
      setMusicGenome(genome);
      saveProfile({ inputs, genome, created: new Date().toISOString() });
      setProfile({ inputs, genome, created: new Date().toISOString() });
      setProcessing(false);
    }, 600);
  }

  // PUBLIC_INTERFACE
  async function handleCreatePlaylist() {
    if (!musicGenome) return;
    setSpotifyStatus('Connecting to Spotify...');
    await fetchSpotifyPlaylist(musicGenome, setSpotifyStatus, setSpotifyPlaylist);
  }

  // PUBLIC_INTERFACE
  function handleReset() {
    setInputs({
      favoriteSmell: '',
      moodAfterIceCream: '',
      nostalgicColor: '',
      currentMoodAnimal: '',
      recentDream: ''
    });
    setMusicGenome(null);
    setSpotifyPlaylist([]);
    setSpotifyStatus('');
  }

  // UI: Input fields config
  const inputFields = [
    { name: 'favoriteSmell', label: 'Favorite Smell', placeholder: 'E.g. Freshly baked bread' },
    { name: 'moodAfterIceCream', label: 'Mood after eating ice cream', placeholder: 'E.g. Blissfully silly' },
    { name: 'nostalgicColor', label: 'Nostalgic Color', placeholder: 'E.g. Neon green' },
    { name: 'currentMoodAnimal', label: 'Current Mood Animal', placeholder: 'E.g. Otter' },
    { name: 'recentDream', label: 'Recent Dream', placeholder: 'Describe your last weird dream' }
  ];

  // ==== RENDER ====
  return (
    <div style={{ background: COLORS.backgroundLight, minHeight: '100vh' }}>
      {/* App Bar */}
      <nav
        style={{
          background: COLORS.primary,
          color: '#fff',
          padding: '18px 0',
          boxShadow: '0 2px 6px rgba(74,144,226,.07)',
          marginBottom: 0
        }}
      >
        <div
          className="container"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ fontWeight: 700, fontSize: '1.35rem', letterSpacing: 1, display: 'flex', gap: 8 }}>
            <span style={{ color: COLORS.accent, fontWeight: 900, fontSize: '2rem' }}>♬</span>
            QuirkyTuneGenie
          </div>
        </div>
      </nav>
      {/* Main Container */}
      <main>
        <div className="container" style={{ paddingTop: 45, paddingBottom: 56 }}>
          {/* Input Section */}
          <section
            style={{
              background: COLORS.sectionBg,
              borderRadius: 16,
              boxShadow: '0 1px 6px rgba(80,227,194,0.06)',
              margin: '0 auto 30px auto',
              maxWidth: 630,
              padding: '32px 32px 20px 32px'
            }}
          >
            <h2 style={{ margin: '0 0 10px 0', color: COLORS.primary, fontWeight: 700 }}>🎭 Quirky Profile</h2>
            <p style={{ color: COLORS.text, marginBottom: 16 }}>
              To conjure up your one-of-a-kind playlist, tell us a few quirky things about yourself:
            </p>
            <form onSubmit={handleGenerateGenome} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
              {inputFields.map(fld => (
                <div key={fld.name} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <label htmlFor={fld.name} style={{ fontWeight: 500, marginBottom: 2 }}>
                    {fld.label}
                  </label>
                  <input
                    id={fld.name}
                    name={fld.name}
                    required
                    value={inputs[fld.name]}
                    onChange={handleInputChange}
                    placeholder={fld.placeholder}
                    style={{
                      border: `1.5px solid ${COLORS.primary}33`,
                      borderRadius: 5,
                      padding: '9px 12px',
                      fontSize: '1rem',
                      outline: 'none',
                      background: '#fff',
                      color: COLORS.text,
                      marginBottom: 2,
                      transition: 'border-color 0.2s'
                    }}
                  />
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10, gap: 8 }}>
                <button
                  type="button"
                  className="btn"
                  onClick={handleReset}
                  style={{ background: COLORS.accent, color: '#fff', border: 'none' }}
                  disabled={processing}
                >
                  Reset
                </button>
                <button
                  type="submit"
                  className="btn"
                  style={{
                    background: COLORS.primary,
                    color: '#fff',
                    border: 'none',
                    minWidth: 112,
                    fontWeight: 600,
                    boxShadow: processing ? '0 1px 8px #4A90E220' : 'none'
                  }}
                  disabled={processing}
                >
                  {processing ? 'Processing...' : 'Generate My Music Genome'}
                </button>
              </div>
            </form>
          </section>

          {/* Music Genome + Playlist */}
          {(musicGenome || profile?.genome) && (
            <section
              style={{
                background: COLORS.background,
                borderRadius: 14,
                boxShadow: '0 1px 8px #4A90E215',
                maxWidth: 700,
                margin: '0 auto 38px auto',
                padding: '30px 30px 25px 30px',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'start', gap: 28, flexWrap: 'wrap' }}>
                {/* Profile/Genome */}
                <div style={{ flex: 1.7, minWidth: 220 }}>
                  <h3 style={{ margin: '0 0 12px 0', color: COLORS.accent, fontWeight: 700 }}>
                    🧬 Your Music Genome
                  </h3>
                  <ProfileGenomeView genome={musicGenome || profile.genome} colors={COLORS} />
                </div>
                {/* Input Display */}
                <div style={{ flex: 2 }}>
                  <h4 style={{ margin: '0 0 10px 0', color: COLORS.secondary, fontWeight: 600 }}>
                    Your Quirks:
                  </h4>
                  <ul style={{ paddingLeft: 18, marginBottom: 0 }}>
                    {Object.entries((profile || {}).inputs || inputs).map(([key, val]) => (
                      <li key={key} style={{ marginBottom: 3, color: COLORS.text }}>
                        <span style={{ color: COLORS.primary, fontWeight: 600 }}>
                          {inputFields.find(f => f.name === key)?.label || key}:
                        </span>{' '}
                        {val}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              {/* Playlist Button */}
              <div style={{ marginTop: 23, marginBottom: 0, textAlign: 'left' }}>
                <button
                  type="button"
                  className="btn"
                  style={{
                    background: COLORS.secondary,
                    color: COLORS.text,
                    border: 'none',
                    fontWeight: 600,
                    letterSpacing: 0.4,
                    minWidth: 132
                  }}
                  onClick={handleCreatePlaylist}
                  disabled={processing}
                >
                  {spotifyStatus && !spotifyPlaylist.length
                    ? spotifyStatus
                    : (spotifyPlaylist.length ? 'Regenerate Playlist' : 'Generate Spotify Playlist')}
                </button>
                <div style={{ marginLeft: 12, color: COLORS.primary, fontWeight: 400, display: 'inline-block' }}>
                  {spotifyStatus && !spotifyPlaylist.length && !processing && (
                    <span style={{ color: '#B22', fontWeight: 400 }}>{spotifyStatus}</span>
                  )}
                </div>
              </div>
              {/* Playlist */}
              {spotifyPlaylist.length > 0 && (
                <PlaylistView tracks={spotifyPlaylist} accent={COLORS.secondary} />
              )}
            </section>
          )}

          {/* Stored Profile Display (if exists, no new genome) */}
          {!musicGenome && !processing && profile && (
            <section
              style={{
                maxWidth: 700,
                margin: '0 auto',
                textAlign: 'center',
                padding: '25px 10px 5px 10px',
                color: COLORS.text
              }}
            >
              <p>
                🌟 <b>Last stored profile loaded.</b> Generate a new one by entering new quirks.
              </p>
            </section>
          )}
        </div>
        {/* Footer */}
        <footer
          style={{
            textAlign: 'center',
            color: COLORS.primary,
            background: '#f5faff',
            fontWeight: 500,
            fontSize: '1.05rem',
            padding: '22px 0',
            borderTop: `2px solid ${COLORS.primary}22`
          }}
        >
          Made with <span style={{ color: COLORS.accent }}>♬</span> by QuirkyTuneGenie
        </footer>
      </main>
    </div>
  );
}

// PUBLIC_INTERFACE
function ProfileGenomeView({ genome, colors }) {
  // Public documentation: Renders the "music genome" attributes as profile cards.
  if (!genome) return null;
  return (
    <div style={{ display: 'flex', gap: 22 }}>
      <div
        style={{
          background: colors.primary,
          color: '#fff',
          padding: '14px 18px',
          borderRadius: 8,
          flex: 1.2,
          textAlign: 'center',
          fontWeight: 700
        }}
      >
        <div style={{ fontSize: '1.9rem', marginBottom: -3 }}>🧬</div>
        Genome ID<br />
        <span style={{ fontWeight: 400, fontSize: '1.2rem', letterSpacing: 1 }}>{genome.genomeId}</span>
      </div>
      <div
        style={{
          background: colors.accent,
          color: colors.text,
          padding: '14px',
          borderRadius: 8,
          flex: 1,
          textAlign: 'center',
          fontWeight: 700
        }}
      >
        <div style={{ fontSize: '1.6rem' }}>🎨</div>
        Tone Color<br />{genome.toneColor}
      </div>
      <div
        style={{
          background: colors.secondary,
          color: '#fff',
          padding: '14px',
          borderRadius: 8,
          flex: 1,
          textAlign: 'center',
          fontWeight: 700
        }}
      >
        <div style={{ fontSize: '1.6rem' }}>😺</div>
        Mood<br />{genome.mood}
      </div>
      <div
        style={{
          background: '#fff',
          color: colors.accent,
          border: `2.5px dotted ${colors.accent}`,
          padding: '14px',
          borderRadius: 8,
          flex: 1,
          textAlign: 'center',
          fontWeight: 700
        }}
      >
        <div style={{ fontSize: '1.7rem' }}>✨</div>
        Weirdness<br />{genome.weirdness}/10
      </div>
    </div>
  );
}

// PUBLIC_INTERFACE
function PlaylistView({ tracks, accent }) {
  // Public doc: Simple Spotify playlist results viewer (demo mode).
  if (!tracks.length) return null;
  return (
    <div
      style={{
        marginTop: 30,
        borderTop: `2px solid ${accent}`,
        paddingTop: 18
      }}
    >
      <div style={{ fontWeight: 600, color: accent, fontSize: '1.2rem', marginBottom: 8 }}>
        Your Quirky Spotify Playlist:
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 18
        }}
      >
        {tracks.map((t, idx) => (
          <a key={idx} href={t.url} target="_blank" rel="noopener noreferrer"
            style={{
              textDecoration: 'none',
              color: '#222',
              background: '#f8fbfe',
              padding: 9,
              borderRadius: 10,
              boxShadow: '0 1px 6px #4A90E211',
              border: `1.5px solid ${accent}22`,
              transition: 'box-shadow 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}
          >
            {t.albumArt &&
              <img src={t.albumArt} alt="album art" style={{ width: 42, height: 42, borderRadius: 8 }} />
            }
            <div>
              <div style={{ fontWeight: 700 }}>{t.name}</div>
              <div style={{ fontSize: '.98rem', color: accent }}>{t.artist}</div>
              <div style={{ fontSize: '.90rem', color: '#888' }}>{t.album}</div>
            </div>
          </a>
        ))}
      </div>
      <div style={{ textAlign: 'right', marginTop: 8, fontSize: '.95rem', color: '#555' }}>
        Powered by Spotify
      </div>
    </div>
  );
}


import { SpotifyAuthCallbackRoute } from './AuthIntegrationUI';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// PUBLIC_INTERFACE
function App() {
  /**
   * The root App of QuirkyTuneGenie.
   * Provides Spotify authentication and uses routing for OAuth callback.
   */
  return (
    <SpotifyAuthProvider>
      <Router>
        <Routes>
          <Route
            path="/callback"
            element={<SpotifyAuthCallbackRoute />}
          />
          <Route
            path="/*"
            element={<QuirkyTuneGenieMain />}
          />
        </Routes>
      </Router>
    </SpotifyAuthProvider>
  );
}

// Replaces QuirkyTuneGenieContainer for main UI (to allow login UI on all pages)
function QuirkyTuneGenieMain() {
  // Render SpotifyLoginButton at top, then main app
  return (
    <>
      <div style={{ maxWidth: 900, margin: "0 auto", paddingTop: 18 }}>
        <SpotifyLoginButton />
      </div>
      <QuirkyTuneGenieContainer />
    </>
  );
}

export default App;
