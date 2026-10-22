import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

const projects = [
  { id: 'commons-index', name: 'Commons Index', category: 'Infrastructure', summary: 'A public catalog for reusable community infrastructure.', goal: 12000, raised: 7200, milestones: [{ id: 'model', title: 'Publish the data model', complete: true }, { id: 'directory', title: 'Release the public directory', complete: true }, { id: 'verify', title: 'Add community verification', complete: false }] },
  { id: 'open-orchard', name: 'Open Orchard', category: 'Climate', summary: 'Track local food-growing projects with transparent milestones.', goal: 9400, raised: 9400, milestones: [{ id: 'map', title: 'Map participating gardens', complete: true }, { id: 'reports', title: 'Publish seasonal reports', complete: true }] },
  { id: 'learning-lantern', name: 'Learning Lantern', category: 'Education', summary: 'Fund open learning modules with clear release plans.', goal: 10000, raised: 3100, milestones: [{ id: 'research', title: 'Interview local educators', complete: true }, { id: 'module', title: 'Publish the first module', complete: false }] },
];
const contributions = new Map();
function send(res, status, payload) { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'access-control-allow-origin': '*' }); res.end(JSON.stringify(payload)); }
function readJson(req) { return new Promise((resolve, reject) => { let raw = ''; req.on('data', (chunk) => { raw += chunk; if (raw.length > 16_384) reject(new Error('payload_too_large')); }); req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error('invalid_json')); } }); req.on('error', reject); }); }
function projectResponse(project) { return { ...project, progress: Math.min(100, Math.round((project.raised / project.goal) * 100)), milestoneCount: project.milestones.length, completedMilestones: project.milestones.filter((item) => item.complete).length }; }

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'OPTIONS') { res.writeHead(204, { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type,idempotency-key' }); return res.end(); }
  if (req.method === 'GET' && url.pathname === '/health') return send(res, 200, { status: 'ok', service: 'ethereal-future-backend', version: '0.2.0', timestamp: new Date().toISOString() });
  if (req.method === 'GET' && url.pathname === '/projects') return send(res, 200, { projects: projects.map(projectResponse) });
  const projectMatch = url.pathname.match(/^\/projects\/([^/]+)$/);
  if (req.method === 'GET' && projectMatch) { const project = projects.find((item) => item.id === projectMatch[1]); return project ? send(res, 200, { project: projectResponse(project) }) : send(res, 404, { error: 'project_not_found' }); }
  const milestoneMatch = url.pathname.match(/^\/projects\/([^/]+)\/milestones$/);
  if (req.method === 'GET' && milestoneMatch) { const project = projects.find((item) => item.id === milestoneMatch[1]); return project ? send(res, 200, { projectId: project.id, milestones: project.milestones }) : send(res, 404, { error: 'project_not_found' }); }
  const contributionMatch = url.pathname.match(/^\/projects\/([^/]+)\/contributions$/);
  if (req.method === 'POST' && contributionMatch) {
    try {
      const project = projects.find((item) => item.id === contributionMatch[1]);
      if (!project) return send(res, 404, { error: 'project_not_found' });
      const key = req.headers['idempotency-key'];
      if (key && contributions.has(`${project.id}:${key}`)) return send(res, 200, { contribution: contributions.get(`${project.id}:${key}`), replayed: true });
      const body = await readJson(req); const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount <= 0) return send(res, 400, { error: 'amount_must_be_positive' });
      if (body.wallet !== undefined && (typeof body.wallet !== 'string' || body.wallet.length < 3)) return send(res, 400, { error: 'wallet_format_invalid' });
      const record = { id: `intent_${randomUUID()}`, projectId: project.id, amount, wallet: body.wallet ?? null, status: 'awaiting_signature', createdAt: new Date().toISOString() };
      if (key) contributions.set(`${project.id}:${key}`, record);
      return send(res, 201, { contribution: record, next: 'sign_and_submit_with_wallet' });
    } catch (error) { return send(res, 400, { error: error.message }); }
  }
  return send(res, 404, { error: 'not_found' });
});
const port = Number(process.env.PORT || 3001); server.listen(port, () => console.log(`Ethereal Future API listening on :${port}`));
