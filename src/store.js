import { randomUUID } from 'node:crypto';

const seedProjects = [
  { id: 'commons-index', name: 'Commons Index', category: 'Infrastructure', summary: 'A public catalog for reusable community infrastructure.', goal: 12000, raised: 7200, milestones: [{ id: 'model', title: 'Publish the data model', complete: true }, { id: 'directory', title: 'Release the public directory', complete: true }, { id: 'verify', title: 'Add community verification', complete: false }] },
  { id: 'open-orchard', name: 'Open Orchard', category: 'Climate', summary: 'Track local food-growing projects with transparent milestones.', goal: 9400, raised: 9400, milestones: [{ id: 'map', title: 'Map participating gardens', complete: true }, { id: 'reports', title: 'Publish seasonal reports', complete: true }] },
  { id: 'learning-lantern', name: 'Learning Lantern', category: 'Education', summary: 'Fund open learning modules with clear release plans.', goal: 10000, raised: 3100, milestones: [{ id: 'research', title: 'Interview local educators', complete: true }, { id: 'module', title: 'Publish the first module', complete: false }] },
];

export function createStore(initialProjects = seedProjects) {
  const projects = structuredClone(initialProjects);
  const contributions = new Map();
  return {
    listProjects() { return projects.map(projectResponse); },
    findProject(id) { return projects.find((project) => project.id === id); },
    createProject(input) {
      const project = { id: input.id, name: input.name, category: input.category, summary: input.summary, goal: input.goal, raised: 0, milestones: [] };
      projects.push(project);
      return projectResponse(project);
    },
    listContributions(projectId) { return [...contributions.values()].filter((item) => item.projectId === projectId); },
    createContribution(project, input, idempotencyKey) {
      const key = idempotencyKey ? `${project.id}:${idempotencyKey}` : null;
      if (key && contributions.has(key)) return { record: contributions.get(key), replayed: true };
      const record = { id: `intent_${randomUUID()}`, projectId: project.id, amount: input.amount, wallet: input.wallet ?? null, status: 'awaiting_signature', createdAt: new Date().toISOString() };
      if (key) contributions.set(key, record);
      return { record, replayed: false };
    },
  };
}

export function projectResponse(project) {
  const completedMilestones = project.milestones.filter((item) => item.complete).length;
  return { ...project, progress: Math.min(100, Math.round((project.raised / project.goal) * 100)), milestoneCount: project.milestones.length, completedMilestones };
}
