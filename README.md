# <img src="README-assets-minecraft.png" alt="Crankshaft Minecraft Logo" width="48" /> Crankshaft

Crankshaft is a Node/React application for provisioning and managing multiple Minecraft Bedrock servers on a single host. It provides a browser-based UI that lets you create servers, monitor output, switch worlds, upload `.mcworld` archives, and control lifecycle commands without touching the console.

> ⚠️ Crankshaft is not affiliated with Mojang or Microsoft. You are responsible for complying with the Minecraft EULA and your hosting provider’s policies.

## Features

- Bedrock and Java edition servers managed side-by-side with per-instance edition selection
- Multi-server management with automatic port selection and conflict detection
- Live Bedrock output viewer with start/stop/update/backup controls
- `.mcworld` uploads with drag-and-drop import and world switching
- Server persistence via JSON configuration and auto-restart on boot
- React frontend styled with NES.css for a nostalgic UI

## Requirements

- Node.js 18+
- npm 9+
- Windows or Linux host capable of running the Bedrock dedicated server
- Java Runtime Environment for Java edition servers (the host must have `java` on the PATH)
- Git (optional, for cloning)

## Getting Started

Clone and install dependencies for the root workspace, server, and frontend:

```bash
git clone https://github.com/<your-org>/crankshaft.git
cd crankshaft
npm install
npm install --prefix server
npm install --prefix frontend
```

### Development

1. Start the backend and frontend build watcher:

   ```bash
   npm run start
   ```

2. Navigate to `http://localhost:9000` (or the port configured in `server/Configuration.json`) to open the UI.

## Java Edition servers

- Choose **Java** in the “Create New Server” form to spin up a Java instance (defaults to 2 GB max memory; override as needed).
- Crankshaft fetches the latest official server JAR, caches it locally, and applies `server.properties` settings (port + online/offline mode).
- EULA acceptance is automated for managed Java instances so they can start unattended.
- World uploads and backups remain Bedrock-only for now; stop/start/update/online-mode toggles work for both editions.

### Production Build

```bash
npm run build
```

This compiles the frontend bundle and the backend TypeScript code. Artifacts are written to `frontend/dist` and `server/dist`.

## Useful npm scripts

| Script | Description |
| --- | --- |
| `npm run build` | Build frontend and backend bundles |
| `npm run build:prod` | Production build (frontend prod config + backend) |
| `npm run start` | Build frontend and start backend watcher |
| `npm run lint` | Run ESLint across the frontend and server code |

## Linting & Formatting

ESLint and Prettier guard the TypeScript/React code. Run `npm run lint` locally before pushing changes. The GitHub Actions workflow also runs lint + build to block regressions.

## Continuous Integration

GitHub Actions (`.github/workflows/ci.yml`) installs dependencies, lints the TypeScript sources, and runs the root build on every push and pull request to `main`. Update the workflow to match your Node version or add additional jobs (tests, packaging) as needed.

### Release Automation

Pushes to `main` also trigger `.github/workflows/release.yml`, which:

- Calculates a semantic version via [GitVersion](GitVersion.yml) using continuous deployment semantics suited for trunk-based workflows
- Updates all workspace `package.json` files with the computed version
- Builds the frontend/server bundles and assembles an npm-ready tarball
- Publishes a GitHub Release with the generated artifact attached
- Optionally runs `npm publish` when an `NPM_TOKEN` secret is provided

This keeps experimental builds flowing automatically from every merged commit.

## Uploading Worlds

To import a world:

1. Stop the target server from the UI.
2. Drag & drop a `.mcworld` file onto the upload box or click “Select World File.”
3. Crankshaft unpacks the archive into the server’s `worlds` directory, updates the Bedrock config, and refreshes the world list.

## Contributing

1. Fork the repository and create a feature branch.
2. Run `npm run lint` and `npm run build` prior to opening a PR.
3. Ensure GitHub Actions succeed.

## License

This project is licensed under the [ISC License](LICENSE).
