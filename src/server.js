import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { createStore } from './store.js';

const port = Number(process.env.PORT || 3001);
const serviceName = process.env.SERVICE_NAME || 'veridian-backend';
const maxBodyBytes = Number(process.env.MAX_BODY_BYTES || 16_384);
const store = createStore();

function headers(requestId) {
  return { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'access-control-allow-origin': '*', 'access-control-expose-headers': 'x-request-id', 'x-request-id': requestId };
}
function send(res, status, payload, requestId) { res.writeHead(status, headers(requestId)); res.end(JSON.stringify(payload)); }
function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; if (raw.length > maxBodyBytes) reject(new Error('payload_too_large')); });
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error('invalid_json')); } });
    req.on('error', reject);
  });
}
function validProjectInput(body) {
  const id = String(body.id || '').trim();
  const name = String(body.name || '').trim();
  const category = String(body.category || '').trim();
  const summary = String(body.summary || '').trim();
  const goal = Number(body.goal);
  if (!/^[a-z0-9-]{3,48}$/.test(id) || !name || !category || !summary || !Number.isFinite(goal) || goal <= 0) throw new Error('project_fields_invalid');
  return { id, name, category, summary, goal };
}

const server = createServer(async (req, res) => {
  const requestId = req.headers['x-request-id'] || randomUUID();
  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname.replace(/^\/api\/v1/, '') || '/';
  if (req.method === 'OPTIONS') { res.writeHead(204, { ...headers(requestId), 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type,idempotency-key,x-request-id' }); return res.end(); }
  if (req.method === 'GET' && path === '/health') return send(res, 200, { status: 'ok', service: serviceName, version: '0.3.0', projectCount: store.listProjects().length, timestamp: new Date().toISOString() }, requestId);
  if (req.method === 'GET' && path === '/projects') return send(res, 200, { projects: store.listProjects() }, requestId);
  if (req.method === 'POST' && path === '/projects') {
    try { return send(res, 201, { project: store.createProject(validProjectInput(await readJson(req))) }, requestId); } catch (error) { return send(res, 400, { error: error.message }, requestId); }
  }
  const projectMatch = path.match(/^\/projects\/([^/]+)$/);
  if (req.method === 'GET' && projectMatch) { const project = store.findProject(projectMatch[1]); return project ? send(res, 200, { project }, requestId) : send(res, 404, { error: 'project_not_found' }, requestId); }
  const milestoneMatch = path.match(/^\/projects\/([^/]+)\/milestones$/);
  if (req.method === 'GET' && milestoneMatch) { const project = store.findProject(milestoneMatch[1]); return project ? send(res, 200, { projectId: project.id, milestones: project.milestones }, requestId) : send(res, 404, { error: 'project_not_found' }, requestId); }
  const contributionMatch = path.match(/^\/projects\/([^/]+)\/contributions$/);
  if ((req.method === 'GET' || req.method === 'POST') && contributionMatch) {
    const project = store.findProject(contributionMatch[1]);
    if (!project) return send(res, 404, { error: 'project_not_found' }, requestId);
    if (req.method === 'GET') return send(res, 200, { projectId: project.id, contributions: store.listContributions(project.id) }, requestId);
    try {
      const body = await readJson(req); const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount <= 0) return send(res, 400, { error: 'amount_must_be_positive' }, requestId);
      if (body.wallet !== undefined && (typeof body.wallet !== 'string' || body.wallet.length < 3)) return send(res, 400, { error: 'wallet_format_invalid' }, requestId);
      const { record, replayed } = store.createContribution(project, { amount, wallet: body.wallet }, req.headers['idempotency-key']);
      return send(res, replayed ? 200 : 201, { contribution: record, replayed, next: 'sign_and_submit_with_wallet' }, requestId);
    } catch (error) { return send(res, 400, { error: error.message }, requestId); }
  }
  return send(res, 404, { error: 'not_found', path }, requestId);
});

server.listen(port, () => console.log(`${serviceName} listening on http://localhost:${port}`));
