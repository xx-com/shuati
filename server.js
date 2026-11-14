'use strict';
// 刷题闭环 · 本地服务器：静态资源 + 真实注册/登录/数据同步 API（零依赖）
// 启动：node server.js   （默认 http://127.0.0.1:8123）

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 8123);
const DATA = path.join(ROOT, 'server-data');
const ADMIN_KEY = process.env.ADMIN_KEY || 'shuati2026';
const USERS_F = path.join(DATA, 'users.json');
const SESS_F = path.join(DATA, 'sessions.json');
const STATE_D = path.join(DATA, 'states');
fs.mkdirSync(STATE_D, { recursive: true });

function readJSON(f, def) {
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return def; }
}
function writeJSON(f, obj) {
  const tmp = f + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8');
  fs.renameSync(tmp, f);
}

let users = readJSON(USERS_F, {});
let sessions = readJSON(SESS_F, {});

function hashPass(pw, salt) {
  return crypto.scryptSync(String(pw), Buffer.from(salt, 'hex'), 64).toString('hex');
}
function validName(u) { return /^[\u4e00-\u9fa5A-Za-z0-9_]{2,20}$/.test(u); }
function stateFile(u) {
  return path.join(STATE_D, crypto.createHash('md5').update(u).digest('hex') + '.json');
}
function tokenOf(req) {
  const m = String(req.headers['authorization'] || '').match(/^Bearer\s+([a-f0-9]{16,64})$/i);
  return m ? m[1] : '';
}
function tokenUser(req) {
  const s = sessions[tokenOf(req)];
  return s ? s.u : null;
}
function newToken(u) {
  const t = crypto.randomBytes(24).toString('hex');
  sessions[t] = { u: u, at: Date.now() };
  writeJSON(SESS_F, sessions);
  return t;
}
function dropToken(req) {
  const t = tokenOf(req);
  if (t && sessions[t]) { delete sessions[t]; writeJSON(SESS_F, sessions); }
}

function readBody(req, max) {
  max = max || 4 * 1024 * 1024;
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > max) { reject(new Error('数据过大')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); }
      catch (e) { reject(new Error('JSON 解析失败')); }
    });
    req.on('error', reject);
  });
}
function send(res, code, obj) {
  const b = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(b);
}

async function handleApi(req, res, p) {
  if (p === '/register' && req.method === 'POST') {
    const b = await readBody(req, 64 * 1024);
    const u = String(b.u || '').trim();
    const pw = String(b.p || '');
    if (!validName(u)) return send(res, 400, { ok: false, msg: '账号需为 2-20 位中文、字母、数字或下划线' });
    if (pw.length < 4 || pw.length > 64) return send(res, 400, { ok: false, msg: '密码需为 4-64 位' });
    if (users[u]) return send(res, 409, { ok: false, msg: '该账号已存在，请直接登录' });
    const salt = crypto.randomBytes(16).toString('hex');
    users[u] = { salt: salt, hash: hashPass(pw, salt), created: new Date().toISOString().slice(0, 10) };
    writeJSON(USERS_F, users);
    return send(res, 200, { ok: true, token: newToken(u), user: u, state: readJSON(stateFile(u), null) });
  }

  if (p === '/login' && req.method === 'POST') {
    const b = await readBody(req, 64 * 1024);
    const u = String(b.u || '').trim();
    const pw = String(b.p || '');
    const rec = users[u];
    if (!rec) return send(res, 404, { ok: false, msg: '账号不存在，请先注册' });
    const h = hashPass(pw, rec.salt);
    const ok = h.length === rec.hash.length &&
      crypto.timingSafeEqual(Buffer.from(h, 'hex'), Buffer.from(rec.hash, 'hex'));
    if (!ok) return send(res, 401, { ok: false, msg: '密码不正确' });
    return send(res, 200, { ok: true, token: newToken(u), user: u, state: readJSON(stateFile(u), null) });
  }

  if (p === '/admin/stats') {
    const key = new URLSearchParams(String(req.url).split('?')[1] || '').get('key') || '';
    if (key !== ADMIN_KEY) return send(res, 401, { ok: false, msg: '管理密钥不正确' });
    const todayStr = new Date().toISOString().slice(0, 10);
    const days = {};
    const perUser = [];
    let totalAns = 0, activeToday = 0;
    Object.keys(users).forEach(u => {
      const d = users[u].created || '?';
      days[d] = (days[d] || 0) + 1;
      const st = readJSON(stateFile(u), null);
      let ans = 0, exams = 0, upd = '';
      if (st) {
        ans = st.answers ? Object.keys(st.answers).length : 0;
        exams = st.exams ? st.exams.length : 0;
        upd = st.updated ? new Date(st.updated).toISOString().slice(0, 10) : '';
        if (upd === todayStr) activeToday++;
      }
      totalAns += ans;
      perUser.push({ u: u, created: d, ans: ans, exams: exams, upd: upd });
    });
    perUser.sort((a, b) => b.ans - a.ans);
    return send(res, 200, {
      ok: true, today: todayStr, total: Object.keys(users).length,
      days: days, totalAns: totalAns, activeToday: activeToday,
      sessions: Object.keys(sessions).length, perUser: perUser
    });
  }

  const me = tokenUser(req);
  if (!me) return send(res, 401, { ok: false, msg: '请先登录' });

  if (p === '/me') return send(res, 200, { ok: true, user: me });

  if (p === '/logout' && req.method === 'POST') {
    dropToken(req);
    return send(res, 200, { ok: true });
  }

  if (p === '/state') {
    if (req.method === 'GET') return send(res, 200, { ok: true, state: readJSON(stateFile(me), null) });
    if (req.method === 'PUT') {
      const b = await readBody(req);
      if (!b || typeof b.state !== 'object' || b.state === null)
        return send(res, 400, { ok: false, msg: '数据格式不正确' });
      writeJSON(stateFile(me), b.state);
      return send(res, 200, { ok: true, at: Date.now() });
    }
  }

  return send(res, 404, { ok: false, msg: '接口不存在' });
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8'
};

http.createServer((req, res) => {
  let p;
  try { p = decodeURIComponent(new URL(req.url, 'http://local').pathname); }
  catch (e) { res.writeHead(400); res.end('Bad Request'); return; }

  if (p.indexOf('/api/') === 0) {
    handleApi(req, res, p.slice(4)).catch(e => {
      if (!res.headersSent) send(res, 400, { ok: false, msg: '请求不合法：' + e.message });
    });
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    send(res, 405, { ok: false, msg: 'Method Not Allowed' });
    return;
  }
  if (p === '/') p = '/index.html';
  const file = path.normalize(path.join(ROOT, p));
  if (file.indexOf(ROOT) !== 0 || file.indexOf(DATA) === 0) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  fs.readFile(file, (err, buf) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    res.end(buf);
  });
}).listen(PORT, () => {
  console.log('刷题闭环 已启动：http://127.0.0.1:' + PORT + '（注册/登录 API 已就绪）');
});
