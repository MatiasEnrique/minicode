# Docker Sandbox

The Docker sandbox provides isolated execution environments for generated React applications.

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      DockerSandbox Class                         │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Configuration                                              │ │
│  │  - containerName: string                                    │ │
│  │  - hostPort: number (5174)                                  │ │
│  │  - containerPort: number (5173)                             │ │
│  │  - workDir: string (/app)                                   │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Operations                                                 │ │
│  │  - start() → Start container                                │ │
│  │  - stop() → Stop container                                  │ │
│  │  - remove() → Delete container                              │ │
│  │  - writeFiles() → Copy files via tar                        │ │
│  │  - exec() → Run command                                     │ │
│  │  - installDependencies() → bun install                      │ │
│  │  - startDevServer() → bun run dev                           │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Docker API
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Docker Container                            │
│                      (local-codegen-sandbox)                     │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  /app                                                       │ │
│  │  ├── node_modules/                                          │ │
│  │  ├── src/                                                   │ │
│  │  │   ├── App.tsx         (generated)                        │ │
│  │  │   ├── main.tsx        (generated)                        │ │
│  │  │   └── components/     (generated)                        │ │
│  │  ├── index.html                                             │ │
│  │  ├── package.json                                           │ │
│  │  ├── vite.config.ts                                         │ │
│  │  └── tailwind.config.js                                     │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Port 5173 → Host Port 5174                                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Dockerfile

```dockerfile
# Dockerfile.sandbox

FROM oven/bun:1

WORKDIR /app

# Create Vite + React + TypeScript template
RUN bun create vite@latest . --template react-ts

# Install base dependencies
RUN bun install

# Add Tailwind CSS
RUN bun add -d tailwindcss postcss autoprefixer
RUN bunx tailwindcss init -p

# Configure Tailwind
RUN echo 'export default { \
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"], \
  theme: { extend: {} }, \
  plugins: [], \
}' > tailwind.config.js

# Add Tailwind directives to CSS
RUN echo '@tailwind base;\n@tailwind components;\n@tailwind utilities;' > src/index.css

# Configure Vite for external access
RUN echo 'import { defineConfig } from "vite";\n\
import react from "@vitejs/plugin-react";\n\
export default defineConfig({\n\
  plugins: [react()],\n\
  server: {\n\
    host: "0.0.0.0",\n\
    port: 5173,\n\
    strictPort: true\n\
  }\n\
});' > vite.config.ts

# Expose Vite dev server port
EXPOSE 5173

# Keep container running (dev server started separately)
CMD ["tail", "-f", "/dev/null"]
```

**Build the image:**
```bash
docker build -t local-codegen-sandbox -f Dockerfile.sandbox .
```

---

## Type Definitions

```typescript
// server/sandbox/types.ts

export interface SandboxConfig {
  containerName: string;
  hostPort: number;       // Port exposed on host machine
  containerPort: number;  // Port inside container (5173 for Vite)
  workDir: string;        // Working directory inside container
}

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface SandboxStatus {
  running: boolean;
  containerId?: string;
  previewUrl?: string;
}

export interface FileOutput {
  filePath: string;
  content: string;
}
```

---

## DockerSandbox Implementation

```typescript
// server/sandbox/docker-sandbox.ts

import Docker from 'dockerode';
import * as tar from 'tar-stream';
import { SandboxConfig, CommandResult, SandboxStatus, FileOutput } from './types';

export class DockerSandbox {
  private docker: Docker;
  private config: SandboxConfig;
  private containerId: string | null = null;

  constructor(config: SandboxConfig) {
    this.docker = new Docker(); // Uses DOCKER_HOST or /var/run/docker.sock
    this.config = config;
  }

  // ============ LIFECYCLE ============

  /**
   * Start the sandbox container
   */
  async start(): Promise<SandboxStatus> {
    // Check if container already exists
    const existing = await this.findContainer();

    if (existing) {
      const info = await existing.inspect();

      // Start if not running
      if (!info.State.Running) {
        console.log(`Starting existing container: ${this.config.containerName}`);
        await existing.start();
      }

      this.containerId = existing.id;
      return this.getStatus();
    }

    // Create new container
    console.log(`Creating container: ${this.config.containerName}`);

    const container = await this.docker.createContainer({
      Image: 'local-codegen-sandbox',
      name: this.config.containerName,
      Tty: true,
      OpenStdin: true,
      WorkingDir: this.config.workDir,
      ExposedPorts: {
        [`${this.config.containerPort}/tcp`]: {},
      },
      HostConfig: {
        PortBindings: {
          [`${this.config.containerPort}/tcp`]: [
            { HostPort: String(this.config.hostPort) },
          ],
        },
      },
      Env: [
        'HOST=0.0.0.0',
        'VITE_HOST=0.0.0.0',
      ],
    });

    await container.start();
    this.containerId = container.id;

    console.log(`Container started: ${this.containerId.slice(0, 12)}`);
    return this.getStatus();
  }

  /**
   * Stop the container
   */
  async stop(): Promise<void> {
    const container = await this.findContainer();

    if (container) {
      const info = await container.inspect();
      if (info.State.Running) {
        console.log(`Stopping container: ${this.config.containerName}`);
        await container.stop();
      }
    }
  }

  /**
   * Remove the container entirely
   */
  async remove(): Promise<void> {
    const container = await this.findContainer();

    if (container) {
      try {
        const info = await container.inspect();
        if (info.State.Running) {
          await container.stop();
        }
      } catch (err) {
        // Container might already be stopped
      }

      console.log(`Removing container: ${this.config.containerName}`);
      await container.remove();
      this.containerId = null;
    }
  }

  /**
   * Get container status
   */
  async getStatus(): Promise<SandboxStatus> {
    const container = await this.findContainer();

    if (!container) {
      return { running: false };
    }

    const info = await container.inspect();

    return {
      running: info.State.Running,
      containerId: container.id,
      previewUrl: info.State.Running
        ? `http://localhost:${this.config.hostPort}`
        : undefined,
    };
  }

  /**
   * Find container by name
   */
  private async findContainer(): Promise<Docker.Container | null> {
    const containers = await this.docker.listContainers({ all: true });

    const found = containers.find((c) =>
      c.Names.some((n) => n === `/${this.config.containerName}`)
    );

    return found ? this.docker.getContainer(found.Id) : null;
  }

  // ============ FILE OPERATIONS ============

  /**
   * Write files to container using tar archive
   */
  async writeFiles(files: FileOutput[]): Promise<void> {
    if (!this.containerId) {
      throw new Error('Container not started');
    }

    const container = this.docker.getContainer(this.containerId);

    // Create tar archive
    const pack = tar.pack();

    for (const file of files) {
      // Remove leading slash if present
      const filePath = file.filePath.replace(/^\//, '');

      // Add file to archive
      pack.entry(
        {
          name: filePath,
          mode: 0o644,
        },
        file.content
      );
    }

    pack.finalize();

    // Convert stream to buffer
    const chunks: Buffer[] = [];
    for await (const chunk of pack) {
      chunks.push(chunk);
    }
    const tarBuffer = Buffer.concat(chunks);

    // Copy to container
    await container.putArchive(tarBuffer, {
      path: this.config.workDir,
    });

    console.log(`Wrote ${files.length} files to container`);
  }

  // ============ COMMAND EXECUTION ============

  /**
   * Execute a command in the container
   */
  async exec(command: string, timeout = 60000): Promise<CommandResult> {
    if (!this.containerId) {
      throw new Error('Container not started');
    }

    const container = this.docker.getContainer(this.containerId);

    // Create exec instance
    const exec = await container.exec({
      Cmd: ['sh', '-c', command],
      AttachStdout: true,
      AttachStderr: true,
      WorkingDir: this.config.workDir,
    });

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Command timed out after ${timeout}ms: ${command}`));
      }, timeout);

      exec.start({}, (err, stream) => {
        if (err) {
          clearTimeout(timeoutId);
          reject(err);
          return;
        }

        let stdout = '';
        let stderr = '';

        // Docker multiplexes stdout/stderr
        stream!.on('data', (chunk: Buffer) => {
          // First 8 bytes are header
          // Byte 0: stream type (1=stdout, 2=stderr)
          // Bytes 4-7: payload size
          if (chunk.length > 8) {
            const type = chunk[0];
            const content = chunk.slice(8).toString();

            if (type === 1) {
              stdout += content;
            } else if (type === 2) {
              stderr += content;
            }
          }
        });

        stream!.on('end', async () => {
          clearTimeout(timeoutId);

          // Get exit code
          const inspectResult = await exec.inspect();

          resolve({
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            exitCode: inspectResult.ExitCode ?? 1,
          });
        });

        stream!.on('error', (err) => {
          clearTimeout(timeoutId);
          reject(err);
        });
      });
    });
  }

  /**
   * Install dependencies via bun
   */
  async installDependencies(): Promise<CommandResult> {
    console.log('Installing dependencies...');
    return this.exec('bun install', 120000); // 2 minute timeout
  }

  /**
   * Start Vite dev server in background
   */
  async startDevServer(): Promise<void> {
    if (!this.containerId) {
      throw new Error('Container not started');
    }

    const container = this.docker.getContainer(this.containerId);

    // Start dev server in background
    const exec = await container.exec({
      Cmd: ['sh', '-c', 'bun run dev &'],
      AttachStdout: true,
      AttachStderr: true,
      WorkingDir: this.config.workDir,
    });

    // Start without waiting for completion
    exec.start({ Detach: true });

    console.log('Dev server starting...');

    // Wait for server to be ready
    await this.waitForServer();
  }

  /**
   * Wait for dev server to respond
   */
  private async waitForServer(maxWait = 30000): Promise<void> {
    const startTime = Date.now();
    const checkInterval = 1000;

    while (Date.now() - startTime < maxWait) {
      try {
        const response = await fetch(
          `http://localhost:${this.config.hostPort}`,
          { method: 'HEAD' }
        );

        if (response.ok || response.status === 304) {
          console.log('Dev server is ready');
          return;
        }
      } catch {
        // Server not ready yet
      }

      await new Promise((r) => setTimeout(r, checkInterval));
    }

    console.warn('Dev server may not be ready (timeout)');
  }

  // ============ ADDITIONAL OPERATIONS ============

  /**
   * Run ESLint
   */
  async runLint(): Promise<CommandResult> {
    return this.exec('bun run lint 2>&1 || true', 30000);
  }

  /**
   * Run TypeScript type check
   */
  async runTypeCheck(): Promise<CommandResult> {
    return this.exec('bunx tsc --noEmit 2>&1 || true', 60000);
  }

  /**
   * Get container logs
   */
  async getLogs(tail = 100): Promise<string> {
    if (!this.containerId) {
      throw new Error('Container not started');
    }

    const container = this.docker.getContainer(this.containerId);
    const logs = await container.logs({
      stdout: true,
      stderr: true,
      tail,
    });

    return logs.toString();
  }

  /**
   * Restart the dev server
   */
  async restartDevServer(): Promise<void> {
    // Kill existing node processes
    await this.exec('pkill -f "vite" || true', 5000);

    // Start fresh
    await this.startDevServer();
  }
}
```

---

## Docker Compose Setup

```yaml
# docker-compose.yml

services:
  postgres:
    image: postgres:16-alpine
    container_name: codegen-postgres
    environment:
      POSTGRES_USER: codegen
      POSTGRES_PASSWORD: codegen_secret
      POSTGRES_DB: codegen
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U codegen"]
      interval: 5s
      timeout: 5s
      retries: 5

  # Optional: Pre-built sandbox container
  sandbox:
    build:
      context: .
      dockerfile: Dockerfile.sandbox
    container_name: codegen-sandbox
    ports:
      - "5174:5173"
    tty: true
    stdin_open: true
    # Note: For dynamic per-project containers,
    # the agent creates containers programmatically

volumes:
  postgres_data:
```

---

## Usage Example

```typescript
import { DockerSandbox } from '@local-codegen/sandbox';

// Create sandbox
const sandbox = new DockerSandbox({
  containerName: 'my-project-sandbox',
  hostPort: 5174,
  containerPort: 5173,
  workDir: '/app',
});

// Start container
await sandbox.start();

// Write generated files
await sandbox.writeFiles([
  {
    filePath: 'src/App.tsx',
    content: `
      import React from 'react';
      export function App() {
        return <div>Hello World</div>;
      }
    `,
  },
  {
    filePath: 'src/main.tsx',
    content: `
      import React from 'react';
      import ReactDOM from 'react-dom/client';
      import { App } from './App';
      import './index.css';

      ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
    `,
  },
]);

// Install dependencies
await sandbox.installDependencies();

// Start dev server
await sandbox.startDevServer();

// Get status
const status = await sandbox.getStatus();
console.log(`Preview: ${status.previewUrl}`); // http://localhost:5174

// Run type check
const typeCheck = await sandbox.runTypeCheck();
if (typeCheck.exitCode !== 0) {
  console.error('Type errors:', typeCheck.stderr);
}

// Cleanup
await sandbox.stop();
// Or to remove entirely:
// await sandbox.remove();
```

---

## Error Handling

```typescript
class DockerSandbox {
  // ... existing methods ...

  /**
   * Safe exec with error handling
   */
  async safeExec(command: string, timeout?: number): Promise<CommandResult> {
    try {
      return await this.exec(command, timeout);
    } catch (error) {
      return {
        stdout: '',
        stderr: error instanceof Error ? error.message : 'Unknown error',
        exitCode: 1,
      };
    }
  }

  /**
   * Check if Docker is available
   */
  async checkDocker(): Promise<boolean> {
    try {
      await this.docker.ping();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Ensure container is running
   */
  async ensureRunning(): Promise<void> {
    const status = await this.getStatus();

    if (!status.running) {
      await this.start();
    }
  }
}
```

---

## Performance Tips

1. **Pre-build the image**: Build `local-codegen-sandbox` once, reuse for all projects

2. **Reuse containers**: Don't remove containers between generations, just update files

3. **Use bun**: Fast installs, better caching

4. **Batch file writes**: Write all files in single tar archive

5. **Keep node_modules**: Don't reinstall unless dependencies change

```typescript
// Smart dependency installation
async smartInstall(newPackageJson: string): Promise<void> {
  const currentPkg = await this.exec('cat package.json');

  if (currentPkg.stdout !== newPackageJson) {
    await this.writeFiles([{
      filePath: 'package.json',
      content: newPackageJson,
    }]);
    await this.installDependencies();
  }
}
```
