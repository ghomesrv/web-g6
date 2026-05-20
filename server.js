const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());

// ======================================================
// DOMAIN CHECK HELPERS
// ======================================================
function isBibleHost(host = '') {
  const h = host.toLowerCase();
  return (
    h.includes('bibletextandcontext.com') ||
    h.includes('www.bibletextandcontext.com')
  );
}

function isEnoviHost(host = '') {
  const h = host.toLowerCase();
  return (
    h.includes('enoviworld.com') ||
    h.includes('www.enoviworld.com')
  );
}

// ======================================================
// ROOT ROUTE - CHOOSE HOMEPAGE BY DOMAIN
// ======================================================
app.get('/', (req, res) => {
  const host = req.headers.host || '';

  if (isBibleHost(host)) {
    return res.sendFile(path.join(__dirname, 'sites', 'bible_text_context', 'index.html'));
  }
  
  if (isEnoviHost(host)) {
    return res.sendFile(path.join(__dirname, 'sites', 'enovi_world', 'index.html'));
  }

  return res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ======================================================
// BIBLE TEXT & ENOVI STATIC FILES BY DOMAIN
// This lets /css, /img, /js, etc. come from correct site
// when the request hostname is bibletextandcontext.com
// or enoviworld.com
// ======================================================
app.use((req, res, next) => {
  const host = req.headers.host || '';

  if (isBibleHost(host)) {
    return express.static(path.join(__dirname, 'sites', 'bible_text_context'))(req, res, next);
  }
  
  if (isEnoviHost(host)) {
    return express.static(path.join(__dirname, 'sites', 'enovi_world'))(req, res, next);
  }

  next();
});

// ======================================================
// MAIN G6 STATIC SITE
// ======================================================
app.use(express.static(path.join(__dirname, 'public')));

// ======================================================
// OPTIONAL DIRECT STATIC ACCESS FOR BIBLE SITE
// Useful if you ever want to test it directly by path
// ======================================================
app.use('/sites/bible_text_context', express.static(path.join(__dirname, 'sites', 'bible_text_context')));
app.use('/sites/enovi_world', express.static(path.join(__dirname, 'sites', 'enovi_world')));

// ======================================================
// ARCADE GAMES - NEW STRUCTURE
// Files now live in /arcade/...
// Keep old URLs active during transition
// ======================================================

// New clean arcade routes
app.use('/arcade/road2mars', express.static(path.join(__dirname, 'arcade', 'road2mars')));
app.use('/arcade/towers-of-hanoi', express.static(path.join(__dirname, 'arcade', 'TowersOfHanoi')));
app.use('/arcade/blockdrop', express.static(path.join(__dirname, 'arcade', 'BlockDrop')));
app.use('/arcade/hangman', express.static(path.join(__dirname, 'arcade', 'Hangman')));

// Legacy arcade routes
app.use('/road2mars', express.static(path.join(__dirname, 'arcade', 'road2mars')));
app.use('/TowersOfHanoi', express.static(path.join(__dirname, 'arcade', 'TowersOfHanoi')));
app.use('/BlockDrop', express.static(path.join(__dirname, 'arcade', 'BlockDrop')));
app.use('/Hangman', express.static(path.join(__dirname, 'arcade', 'Hangman')));

// ======================================================
// WORLDS - NEW STRUCTURE
// ======================================================

// World hub pages
app.use('/worlds/soulrender', express.static(path.join(__dirname, 'worlds', 'soulrender')));
app.use('/worlds/ogre-lands', express.static(path.join(__dirname, 'worlds', 'ogre-lands')));
app.use('/worlds/little-vikings', express.static(path.join(__dirname, 'worlds', 'little-vikings')));

// Explicit world subfolder routes
app.use('/worlds/soulrender/game', express.static(path.join(__dirname, 'worlds', 'soulrender', 'game')));
app.use('/worlds/soulrender/story', express.static(path.join(__dirname, 'worlds', 'soulrender', 'story')));
app.use('/worlds/soulrender/lore', express.static(path.join(__dirname, 'worlds', 'soulrender', 'lore')));

app.use('/worlds/ogre-lands/game', express.static(path.join(__dirname, 'worlds', 'ogre-lands', 'game')));
app.use('/worlds/ogre-lands/story', express.static(path.join(__dirname, 'worlds', 'ogre-lands', 'story')));
app.use('/worlds/ogre-lands/lore', express.static(path.join(__dirname, 'worlds', 'ogre-lands', 'lore')));

app.use('/worlds/little-vikings/game', express.static(path.join(__dirname, 'worlds', 'little-vikings', 'game')));
app.use('/worlds/little-vikings/story', express.static(path.join(__dirname, 'worlds', 'little-vikings', 'story')));
app.use('/worlds/little-vikings/lore', express.static(path.join(__dirname, 'worlds', 'little-vikings', 'lore')));

// ======================================================
// LEGACY STORY ROUTES
// ======================================================
app.use('/stories_fantasy', express.static(path.join(__dirname, 'worlds', 'soulrender', 'story')));
app.use('/stories_ogres', express.static(path.join(__dirname, 'worlds', 'ogre-lands', 'story')));
app.use('/stories_vikings', express.static(path.join(__dirname, 'worlds', 'little-vikings', 'story')));

// Keep only if still needed
app.use('/games_fantasy', express.static(path.join(__dirname, 'games_fantasy')));

// ======================================================
// API
// ======================================================
app.get('/api', (req, res) => {
  res.json({ message: 'Hello from Express API!' });
});

// ======================================================
// START SERVER
// ======================================================
const HTTP_PORT = 3000;

app.listen(HTTP_PORT, () => {
  console.log(`Express server running on http://localhost:${HTTP_PORT}`);
  console.log(`  - G6 Media root served from /public`);
  console.log(`  - Bible Text & Context root served from /sites/bible_text_context by domain check`);
  console.log(`  - Enovi World served from /sites/enovi_world by domain check`);
  console.log(`  - Arcade served from /arcade with both new and legacy URLs`);
  console.log(`  - Worlds served from /worlds`);
  console.log(`  - Legacy story URLs still active during transition`);
});
