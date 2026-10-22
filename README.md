# Ethereal Future Backend

An original API starter for publishing project metadata and recording transparent contribution intents. It is intentionally small and auditable so future services can evolve without hiding business rules in framework glue.

## Current implementation

- `GET /health` returns service status and API version.
- `GET /projects` returns the current project catalog.
- `POST /projects/:id/contributions` validates and records a contribution intent in memory.
- CORS, JSON parsing, validation, and consistent error responses are included without external runtime dependencies.

## Development

Requires Node.js 20+. Run `npm start`. Data is intentionally in-memory for this starter; persistence and wallet verification belong in future issue-scoped changes.

## Contribution workflow

Open an issue first, branch from `develop`, and target `develop` in pull requests. See `CONTRIBUTING.md`.

## License

MIT. See `LICENSE`.
