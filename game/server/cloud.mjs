// Bulut kaydı + küresel sıralama sunucusu.
// Kimlik: istemci Firebase ID token'ını "Authorization: Bearer" ile gönderir; burada Google'ın
// açık anahtarlarıyla doğrulanır (iss/aud = Firebase proje kimliği). Doğrulanmamış istek yazamaz.
//
// Kurulum:   cd server && npm install
// Çalıştır:  FIREBASE_PROJECT_ID=efsun-avcisi DATA_DIR=./data PORT=8788 node cloud.mjs
// Not: Basitlik için veriler JSON dosyalarında tutulur. Çok oyunculu ölçekte (on binlerce oyuncu)
// aynı uç noktaları Firestore / PostgreSQL ile değiştirin.
import express from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { mkdirSync, readFileSync, writeFileSync, rmSync, existsSync, renameSync } from 'node:fs';
import { join } from 'node:path';

const PROJECT = process.env.FIREBASE_PROJECT_ID;
if (!PROJECT) { console.error('FIREBASE_PROJECT_ID gerekli'); process.exit(1); }
const DATA = process.env.DATA_DIR || './data';
mkdirSync(join(DATA, 'saves'), { recursive: true });
const JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));
const BOARDS = ['chapter', 'power', 'kills', 'combo', 'arena'];
const LIMITS = { chapter: 10000, power: 1e10, kills: 1e9, combo: 1e6, arena: 100000 };

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.set('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

async function uidOf(req) {
  const h = req.get('Authorization') || '';
  if (!h.startsWith('Bearer ')) return null;
  try {
    const { payload } = await jwtVerify(h.slice(7), JWKS, { issuer: `https://securetoken.google.com/${PROJECT}`, audience: PROJECT });
    return typeof payload.sub === 'string' && /^[A-Za-z0-9_-]{6,128}$/.test(payload.sub) ? payload.sub : null;
  } catch (e) { return null; }
}
const auth = fn => async (req, res) => {
  const uid = await uidOf(req);
  if (!uid) return res.status(401).json({ error: 'unauthorized' });
  try { await fn(req, res, uid); } catch (e) { console.error(e); res.status(500).json({ error: 'server' }); }
};

const savePath = uid => join(DATA, 'saves', uid + '.json');
const writeAtomic = (p, data) => { writeFileSync(p + '.tmp', data); renameSync(p + '.tmp', p); };
const scoresPath = join(DATA, 'scores.json');
let scores = existsSync(scoresPath) ? JSON.parse(readFileSync(scoresPath, 'utf8')) : {};
let dirty = false;
setInterval(() => { if (dirty) { writeAtomic(scoresPath, JSON.stringify(scores)); dirty = false; } }, 5000);

// ---- kayıt ----
app.get('/save', auth((req, res, uid) => {
  if (!existsSync(savePath(uid))) return res.sendStatus(404);
  res.type('json').send(readFileSync(savePath(uid), 'utf8'));
}));
app.put('/save', auth((req, res, uid) => {
  const save = req.body?.save;
  if (!save || typeof save !== 'object' || typeof save.maxChapter !== 'number') return res.status(400).json({ error: 'bad save' });
  writeAtomic(savePath(uid), JSON.stringify({ save, updated: Date.now() }));
  res.json({ ok: true });
}));

// ---- hesap silme (Apple yönergesi 5.1.1(v)) ----
app.delete('/account', auth((req, res, uid) => {
  rmSync(savePath(uid), { force: true });
  delete scores[uid]; dirty = true;
  res.json({ ok: true });
}));

// ---- sıralama ----
app.post('/scores', auth((req, res, uid) => {
  const b = req.body || {};
  const name = String(b.name || 'Avcı').replace(/[<>]/g, '').slice(0, 16);
  const entry = { name, hero: String(b.hero || 'kaya').slice(0, 12), at: Date.now() };
  for (const k of BOARDS) {
    const v = Math.floor(Number(b[k]) || 0);
    if (v < 0 || v > LIMITS[k]) return res.status(400).json({ error: 'bad score' });
    entry[k] = Math.max(v, scores[uid]?.[k] || 0); // skor geriye gitmez
  }
  scores[uid] = entry; dirty = true;
  res.json({ ok: true });
}));
app.get('/leaderboard', async (req, res) => {
  const board = BOARDS.includes(req.query.board) ? req.query.board : 'chapter';
  const me = await uidOf(req);
  const all = Object.entries(scores).filter(([, e]) => e[board] > 0).sort((a, b) => b[1][board] - a[1][board] || a[1].at - b[1].at);
  const top = all.slice(0, 50).map(([u, e], i) => ({ rank: i + 1, name: e.name, hero: e.hero, value: e[board], me: u === me }));
  const myIdx = me ? all.findIndex(([u]) => u === me) : -1;
  res.json({ top, myRank: myIdx >= 0 ? myIdx + 1 : null, total: all.length });
});

app.get('/health', (req, res) => res.json({ ok: true }));
app.listen(process.env.PORT || 8788, () => console.log('Bulut sunucusu hazır'));
