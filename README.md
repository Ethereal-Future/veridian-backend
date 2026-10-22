# Veridian Backend

Veridian Backend is an original API for publishing public-good project metadata and recording transparent contribution intents. It keeps domain rules visible and framework-light so persistence, wallet verification, and indexing can be introduced as focused contributions.

## Product boundary

The API does not custody funds and does not claim that an intent is a completed payment. A contribution intent is a user request that can later be reviewed, signed by a wallet, submitted to a network, and reconciled by an indexer.

## Current implementation

- `GET /health` returns service status and API version.
- `GET /projects` returns project progress and milestone summaries.
- `GET /projects/:id` returns one project or `project_not_found`.
- `GET /projects/:id/milestones` returns public milestone data.
- `POST /projects` validates and initializes a new project with an empty milestone list.
- `POST /projects/:id/contributions` validates positive amounts, optional wallet values, and idempotency keys before recording an in-memory intent.
- `GET /projects/:id/contributions` exposes contribution intents for the project read model.
- Consistent JSON responses, CORS preflight handling, bounded request bodies, and explicit error codes.

## Architecture

```text
Browser / wallet adapter -> HTTP API -> validation -> intent store -> future indexer
                                                |                     |
                                                +-> project read model  +-> network reconciliation
```

The current store is initialized with three domain projects at process startup and kept behind `src/store.js`. A future persistence issue should define schema, migrations, replay behavior, and idempotency semantics before a database is introduced.

## Start locally

```bash
npm start
# Veridian API listens on http://localhost:3001
curl http://localhost:3001/health
```

All routes also accept the `/api/v1` prefix. Set `PORT`, `SERVICE_NAME`, and `MAX_BODY_BYTES` through the environment or copy `.env.example` into your local configuration.

## Example

```bash
curl http://localhost:3001/projects
curl -X POST http://localhost:3001/projects/commons-index/contributions \\
  -H 'content-type: application/json' -H 'idempotency-key: demo-001' \\
  -d '{"amount":25,"wallet":"G..."}'
```

## Roadmap

- Replace memory storage with a migration-backed database.
- Add signed wallet intent verification and network selection.
- Add event ingestion and reconciliation status.
- Add maintainer audit events and persistent rate limits.

## Contribution workflow

Open an issue before work, branch from `develop`, document validation behavior, and target `develop` in pull requests. Drips recognition is controlled by the applicable program and maintainers; a merge is not a guarantee of points or funding.

## License

MIT. See `LICENSE`.
