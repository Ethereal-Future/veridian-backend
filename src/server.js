import { createServer } from 'node:http';

const projects = [
  { id: 'commons-index', name: 'Commons Index', category: 'Infrastructure', goal: 12000, raised: 7200 },
  { id: 'open-orchard', name: 'Open Orchard', category: 'Climate', goal: 9400, raised: 9400 },
];
const contributions = [];

function send(res, status, payload) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*' });
  res.end(JSON.stringify(payload));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; if (raw.length > 16_384) reject(new Error('payload too large')); });
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error('invalid JSON')); } });
    req.on('error', reject);
  });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'OPTIONS') { res.writeHead(204, { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type' }); return res.end(); }
  if (req.method === 'GET' && url.pathname === '/health') return send(res, 200, { status: 'ok', service: 'ethereal-future-backend', version: '0.1.0' });
  if (req.method === 'GET' && url.pathname === '/projects') return send(res, 200, { projects });
  const match = url.pathname.match(/^\/projects\/([^/]+)\/contributions$/);
  if (req.method === 'POST' && match) {
    try {
      const body = await readJson(req);
      const project = projects.find((item) => item.id === match[1]);
      const amount = Number(body.amount);
      if (!project) return send(res, 404, { error: 'project_not_found' });
      if (!Number.isFinite(amount) || amount <= 0) return send(res, 400, { error: 'amount_must_be_positive' });
      const record = { id: `intent_${contributions.length + 1}`, projectId: project.id, amount, wallet: body.wallet ?? null, createdAt: new Date().toISOString() };
      contributions.push(record);
      return send(res, 201, { contribution: record });
    } catch (error) { return send(res, 400, { error: error.message }); }
  }
  return send(res, 404, { error: 'not_found' });
});

const port = Number(process.env.PORT || 3001);
server.listen(port, () => console.log(`Ethereal Future API listening on :${port}`));
