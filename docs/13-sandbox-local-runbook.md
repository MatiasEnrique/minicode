# Sandbox Local Runbook

This runbook documents how to run the sandbox container locally with Docker.

## Current Status

- The sandbox is **not yet wired** into `server/index.ts` or the agent pipeline.
- These steps validate Docker image build, container lifecycle, and preview-port exposure (`5174 -> 5173`).

## Files

- Base image: `Dockerfile.sandbox`
- Architecture target: `docs/05-docker-sandbox.md`
- Current-vs-target source: `project-state/current-vs-target.md`

## Prerequisites

- Docker Engine installed and running
- Bun installed

## 1. Build Sandbox Image

```bash
docker build -t minicode-sandbox -f Dockerfile.sandbox .
```

## 2. Start Sandbox Container

```bash
docker run -d \
  --name minicode-sandbox-dev \
  -p 5174:5173 \
  minicode-sandbox
```

## 3. Smoke Test Preview Port

Start a minimal HTTP server inside the container:

```bash
docker exec -d minicode-sandbox-dev sh -lc \
  "bun -e \"Bun.serve({hostname:'0.0.0.0',port:5173,fetch(){return new Response('sandbox ok')}})\""
```

Verify from host:

```bash
curl http://localhost:5174
```

Expected response:

```text
sandbox ok
```

## 4. Stop and Cleanup

```bash
docker stop minicode-sandbox-dev
docker rm minicode-sandbox-dev
```

## Notes

- This runbook confirms container and port behavior only.
- Full generated-app workflow (file writes, `bun install`, `bun run dev`, preview URL lifecycle) will be implemented in roadmap phases 5-7.
