# Agent System

The agent system replaces Cloudflare Durable Objects with a local TypeScript implementation. It provides stateful, persistent agents that orchestrate code generation.

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Agent Manager                             │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  agents: Map<projectId, CodeGeneratorAgent>               │  │
│  │                                                           │  │
│  │  getOrCreateAgent(projectId) → Load from DB or create     │  │
│  │  removeAgent(projectId) → Save state and cleanup          │  │
│  │  cleanupInactiveAgents() → Periodic cleanup               │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ manages
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CodeGeneratorAgent                            │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  State (persisted to PostgreSQL):                         │  │
│  │  - currentState: AgentState                               │  │
│  │  - phases: Phase[]                                        │  │
│  │  - generatedFiles: Map<path, FileOutput>                  │  │
│  │  - previewUrl: string                                     │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Connections (in-memory):                                 │  │
│  │  - connections: Set<WebSocket>                            │  │
│  │  - abortController: AbortController                       │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Services:                                                │  │
│  │  - sandbox: DockerSandbox                                 │  │
│  │  - generator: OpenRouter client                           │  │
│  │  - parser: SCOF parser                                    │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Type Definitions

```typescript
// shared/types/index.ts

export enum AgentState {
  IDLE = 'idle',
  DESIGNING_PHASE = 'designing_phase',
  IMPLEMENTING_PHASE = 'implementing_phase',
  INSTALLING_DEPS = 'installing_deps',
  STARTING_SERVER = 'starting_server',
  COMPLETE = 'complete',
  ERROR = 'error',
}

export interface Phase {
  name: string;
  description: string;
  files: Array<{
    path: string;
    purpose: string;
  }>;
  isLastPhase: boolean;
}

export interface FileOutput {
  filePath: string;
  content: string;
}

export interface AgentPersistedState {
  projectId: string;
  currentState: AgentState;
  currentPhaseIndex: number;
  phases: Phase[];
  sandboxContainerId?: string;
  previewUrl?: string;
}

export interface AgentEvents {
  state_change: { state: AgentState };
  phase_designing: { phaseNumber: number };
  phase_designed: { phase: Phase };
  file_start: { path: string };
  file_chunk: { path: string; chunk: string };
  file_end: { path: string; content: string };
  files_written: { count: number };
  deps_installed: {};
  server_started: { url: string };
  generation_complete: { files: string[]; phases: number };
  error: { message: string };
}
```

---

## BaseAgent Class

The abstract base class provides common functionality for all agents.

```typescript
// server/agents/base-agent.ts

import { EventEmitter } from 'events';
import type { Database } from '@local-codegen/shared/db';
import type { AgentPersistedState, AgentEvents, AgentState } from './types';

/**
 * BaseAgent - Abstract base class for stateful agents
 *
 * Replaces Cloudflare Durable Objects with:
 * - State persisted to PostgreSQL
 * - WebSocket connections managed explicitly
 * - EventEmitter for internal communication
 */
export abstract class BaseAgent<TState extends AgentPersistedState> extends EventEmitter {
  protected state: TState;
  protected db: Database;
  protected connections: Set<WebSocket> = new Set();
  protected abortController?: AbortController;

  constructor(initialState: TState, db: Database) {
    super();
    this.state = initialState;
    this.db = db;
  }

  // ============ TYPE-SAFE EVENTS ============

  emit<K extends keyof AgentEvents>(event: K, data: AgentEvents[K]): boolean {
    return super.emit(event, data);
  }

  on<K extends keyof AgentEvents>(event: K, listener: (data: AgentEvents[K]) => void): this {
    return super.on(event, listener as (...args: unknown[]) => void);
  }

  // ============ CONNECTION MANAGEMENT ============

  /**
   * Add a WebSocket connection to this agent
   */
  addConnection(ws: WebSocket): void {
    this.connections.add(ws);

    // Send current state on connect
    this.sendTo(ws, 'state_change', { state: this.state.currentState as AgentState });
  }

  /**
   * Remove a WebSocket connection
   */
  removeConnection(ws: WebSocket): void {
    this.connections.delete(ws);
  }

  /**
   * Check if agent has any active connections
   */
  hasConnections(): boolean {
    return this.connections.size > 0;
  }

  // ============ BROADCASTING ============

  /**
   * Broadcast event to all connected WebSocket clients
   */
  broadcast<K extends keyof AgentEvents>(event: K, data: AgentEvents[K]): void {
    const message = JSON.stringify({ type: event, data });

    for (const ws of this.connections) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    }

    // Also emit locally for logging/hooks
    this.emit(event, data);
  }

  /**
   * Send event to a specific WebSocket client
   */
  sendTo<K extends keyof AgentEvents>(ws: WebSocket, event: K, data: AgentEvents[K]): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: event, data }));
    }
  }

  // ============ STATE MANAGEMENT ============

  /**
   * Get a copy of the current state
   */
  getState(): TState {
    return { ...this.state };
  }

  /**
   * Update state (internal use)
   */
  protected setState(updates: Partial<TState>): void {
    this.state = { ...this.state, ...updates };
  }

  // ============ PERSISTENCE (Abstract) ============

  /**
   * Save current state to database
   */
  abstract save(): Promise<void>;

  /**
   * Load state from database
   */
  abstract load(): Promise<void>;

  // ============ CANCELLATION ============

  /**
   * Cancel any ongoing operation
   */
  cancel(): void {
    this.abortController?.abort();
  }

  /**
   * Check if operation was cancelled
   */
  isAborted(): boolean {
    return this.abortController?.signal.aborted ?? false;
  }

  /**
   * Create new abort controller for operation
   */
  protected createAbortController(): AbortController {
    this.abortController = new AbortController();
    return this.abortController;
  }
}
```

---

## CodeGeneratorAgent

The main agent class that orchestrates code generation.

```typescript
// server/agents/code-generator-agent.ts

import { eq } from 'drizzle-orm';
import { BaseAgent } from './base-agent';
import { AgentState, AgentPersistedState, Phase, FileOutput } from './types';
import { db, agentStates, generatedFiles, projects } from '@local-codegen/shared/db';
import { DockerSandbox } from '@local-codegen/sandbox';
import { designPhase, implementPhase } from './generator';
import { createStreamingState, StreamingState } from './parser';

interface CodeGenAgentState extends AgentPersistedState {
  generatedFiles: Map<string, FileOutput>;
}

export class CodeGeneratorAgent extends BaseAgent<CodeGenAgentState> {
  private sandbox: DockerSandbox;
  private maxPhases: number;
  private model: string;

  constructor(
    projectId: string,
    options: {
      maxPhases?: number;
      model?: string;
      sandboxPort?: number;
    } = {}
  ) {
    // Initialize with default state
    const initialState: CodeGenAgentState = {
      projectId,
      currentState: AgentState.IDLE,
      currentPhaseIndex: 0,
      phases: [],
      generatedFiles: new Map(),
    };

    super(initialState, db);

    this.maxPhases = options.maxPhases ?? 5;
    this.model = options.model ?? 'anthropic/claude-3.5-sonnet';

    // Initialize sandbox
    this.sandbox = new DockerSandbox({
      containerName: `codegen-sandbox-${projectId}`,
      hostPort: options.sandboxPort ?? 5174,
      containerPort: 5173,
      workDir: '/app',
    });
  }

  // ============ PERSISTENCE ============

  async save(): Promise<void> {
    const {
      projectId,
      currentState,
      currentPhaseIndex,
      phases,
      sandboxContainerId,
      previewUrl,
    } = this.state;

    // Upsert agent state
    await this.db
      .insert(agentStates)
      .values({
        projectId,
        currentState,
        currentPhaseIndex,
        phases: JSON.stringify(phases),
        sandboxContainerId,
        previewUrl,
      })
      .onConflictDoUpdate({
        target: agentStates.projectId,
        set: {
          currentState,
          currentPhaseIndex,
          phases: JSON.stringify(phases),
          sandboxContainerId,
          previewUrl,
          updatedAt: new Date(),
        },
      });

    // Save generated files
    for (const [filePath, file] of this.state.generatedFiles) {
      await this.db
        .insert(generatedFiles)
        .values({
          projectId,
          filePath,
          content: file.content,
          phaseIndex: currentPhaseIndex,
        })
        .onConflictDoUpdate({
          target: [generatedFiles.projectId, generatedFiles.filePath],
          set: {
            content: file.content,
            phaseIndex: currentPhaseIndex,
            updatedAt: new Date(),
          },
        });
    }
  }

  async load(): Promise<void> {
    // Load agent state
    const [agentState] = await this.db
      .select()
      .from(agentStates)
      .where(eq(agentStates.projectId, this.state.projectId));

    if (agentState) {
      this.setState({
        currentState: agentState.currentState as AgentState,
        currentPhaseIndex: agentState.currentPhaseIndex,
        phases: agentState.phases as Phase[],
        sandboxContainerId: agentState.sandboxContainerId ?? undefined,
        previewUrl: agentState.previewUrl ?? undefined,
      });
    }

    // Load generated files
    const files = await this.db
      .select()
      .from(generatedFiles)
      .where(eq(generatedFiles.projectId, this.state.projectId));

    const filesMap = new Map<string, FileOutput>();
    for (const file of files) {
      filesMap.set(file.filePath, {
        filePath: file.filePath,
        content: file.content,
      });
    }
    this.setState({ generatedFiles: filesMap });
  }

  // ============ GENERATION ============

  async generate(projectDescription: string): Promise<void> {
    this.createAbortController();

    try {
      // Update project status
      await this.db
        .update(projects)
        .set({ status: 'generating' })
        .where(eq(projects.id, this.state.projectId));

      let phaseCount = 0;

      while (phaseCount < this.maxPhases) {
        if (this.isAborted()) {
          console.log('Generation cancelled');
          break;
        }

        // ===== DESIGN PHASE =====
        this.setState({ currentState: AgentState.DESIGNING_PHASE });
        this.broadcast('state_change', { state: AgentState.DESIGNING_PHASE });
        this.broadcast('phase_designing', { phaseNumber: phaseCount + 1 });

        console.log(`Designing phase ${phaseCount + 1}...`);

        const phase = await designPhase(
          projectDescription,
          Array.from(this.state.generatedFiles.keys()),
          this.state.phases,
          this.model
        );

        // Update state with new phase
        this.setState({
          phases: [...this.state.phases, phase],
          currentPhaseIndex: phaseCount,
        });
        this.broadcast('phase_designed', { phase });

        console.log(`Phase designed: ${phase.name}`);

        // ===== IMPLEMENT PHASE =====
        this.setState({ currentState: AgentState.IMPLEMENTING_PHASE });
        this.broadcast('state_change', { state: AgentState.IMPLEMENTING_PHASE });

        console.log(`Implementing: ${phase.name}...`);

        const streamState = createStreamingState();

        await implementPhase(
          phase,
          this.state.generatedFiles,
          {
            onFileStart: (path) => {
              console.log(`  Generating: ${path}`);
              this.broadcast('file_start', { path });
            },
            onFileChunk: (path, chunk) => {
              this.broadcast('file_chunk', { path, chunk });
            },
            onFileEnd: (path, content) => {
              // Update local state
              this.state.generatedFiles.set(path, { filePath: path, content });
              this.broadcast('file_end', { path, content });
            },
          },
          streamState,
          this.model,
          this.abortController?.signal
        );

        // Write files to sandbox
        const newFiles = Array.from(streamState.completedFiles.values());
        console.log(`Writing ${newFiles.length} files to sandbox...`);
        await this.sandbox.writeFiles(newFiles);
        this.broadcast('files_written', { count: newFiles.length });

        // First phase: setup sandbox
        if (phaseCount === 0) {
          await this.setupSandbox();
        }

        // Save state after each phase
        await this.save();

        phaseCount++;

        if (phase.isLastPhase) {
          console.log('Final phase complete!');
          break;
        }
      }

      // Mark complete
      this.setState({ currentState: AgentState.COMPLETE });
      this.broadcast('state_change', { state: AgentState.COMPLETE });
      this.broadcast('generation_complete', {
        files: Array.from(this.state.generatedFiles.keys()),
        phases: this.state.phases.length,
      });

      await this.db
        .update(projects)
        .set({ status: 'complete' })
        .where(eq(projects.id, this.state.projectId));

      await this.save();

    } catch (error) {
      console.error('Generation error:', error);

      this.setState({ currentState: AgentState.ERROR });
      this.broadcast('state_change', { state: AgentState.ERROR });
      this.broadcast('error', { message: (error as Error).message });

      await this.db
        .update(projects)
        .set({ status: 'error' })
        .where(eq(projects.id, this.state.projectId));

      throw error;
    }
  }

  private async setupSandbox(): Promise<void> {
    // Install dependencies
    this.setState({ currentState: AgentState.INSTALLING_DEPS });
    this.broadcast('state_change', { state: AgentState.INSTALLING_DEPS });

    console.log('Installing dependencies...');
    await this.sandbox.installDependencies();
    this.broadcast('deps_installed', {});

    // Start dev server
    this.setState({ currentState: AgentState.STARTING_SERVER });
    this.broadcast('state_change', { state: AgentState.STARTING_SERVER });

    console.log('Starting dev server...');
    await this.sandbox.startDevServer();

    const status = await this.sandbox.getStatus();
    this.setState({ previewUrl: status.previewUrl });
    this.broadcast('server_started', { url: status.previewUrl! });

    console.log(`Dev server running at ${status.previewUrl}`);
  }

  // ============ SANDBOX MANAGEMENT ============

  async initializeSandbox(): Promise<void> {
    await this.sandbox.start();
    const status = await this.sandbox.getStatus();
    this.setState({
      sandboxContainerId: status.containerId,
      previewUrl: status.previewUrl,
    });
  }

  async cleanupSandbox(): Promise<void> {
    await this.sandbox.stop();
  }

  async destroySandbox(): Promise<void> {
    await this.sandbox.remove();
  }

  getPreviewUrl(): string | undefined {
    return this.state.previewUrl;
  }
}
```

---

## AgentManager

Manages the lifecycle of agent instances.

```typescript
// server/agents/agent-manager.ts

import { CodeGeneratorAgent } from './code-generator-agent';

/**
 * AgentManager - Singleton that manages active agent instances
 *
 * Replaces Cloudflare's Durable Object stub mechanism.
 * - Agents are created on-demand and cached in memory
 * - Inactive agents are periodically cleaned up
 * - State is persisted to PostgreSQL
 */
export class AgentManager {
  private agents: Map<string, CodeGeneratorAgent> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor(cleanupIntervalMs = 60000) {
    // Periodically clean up agents with no connections
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveAgents();
    }, cleanupIntervalMs);
  }

  /**
   * Get existing agent or create new one
   */
  async getOrCreateAgent(projectId: string): Promise<CodeGeneratorAgent> {
    let agent = this.agents.get(projectId);

    if (!agent) {
      console.log(`Creating new agent for project: ${projectId}`);

      agent = new CodeGeneratorAgent(projectId);
      await agent.load(); // Load state from database

      this.agents.set(projectId, agent);
    }

    return agent;
  }

  /**
   * Get agent if it exists (no creation)
   */
  getAgent(projectId: string): CodeGeneratorAgent | undefined {
    return this.agents.get(projectId);
  }

  /**
   * Remove agent and cleanup resources
   */
  async removeAgent(projectId: string): Promise<void> {
    const agent = this.agents.get(projectId);

    if (agent) {
      console.log(`Removing agent for project: ${projectId}`);

      await agent.save();
      await agent.cleanupSandbox();

      this.agents.delete(projectId);
    }
  }

  /**
   * Clean up agents with no active connections
   */
  private cleanupInactiveAgents(): void {
    for (const [projectId, agent] of this.agents) {
      if (!agent.hasConnections()) {
        console.log(`Cleaning up inactive agent: ${projectId}`);

        agent.save().then(() => {
          this.agents.delete(projectId);
        }).catch(err => {
          console.error(`Error saving agent ${projectId}:`, err);
        });
      }
    }
  }

  /**
   * Get count of active agents
   */
  getActiveCount(): number {
    return this.agents.size;
  }

  /**
   * Shutdown all agents (for graceful server shutdown)
   */
  async shutdown(): Promise<void> {
    clearInterval(this.cleanupInterval);

    const savePromises: Promise<void>[] = [];

    for (const [projectId, agent] of this.agents) {
      console.log(`Saving agent: ${projectId}`);
      savePromises.push(agent.save());
    }

    await Promise.all(savePromises);
    this.agents.clear();
  }
}

// Singleton instance
export const agentManager = new AgentManager();
```

---

## Comparison: Cloudflare Agents vs Local Implementation

| Feature | Cloudflare Durable Objects | Local Implementation |
|---------|---------------------------|----------------------|
| **State Storage** | DO storage (built-in) | PostgreSQL + Drizzle |
| **Instance Management** | Automatic via stubs | AgentManager singleton |
| **WebSocket** | DO WebSocket API | Manual Set<WebSocket> |
| **Persistence** | Automatic | Explicit save() calls |
| **Hibernation** | Built-in | Not needed (in-memory) |
| **Scaling** | Global edge network | Single server |
| **Isolation** | Automatic per-instance | In-process Map |

---

## Usage Example

```typescript
import { agentManager } from '@local-codegen/agent';

// In WebSocket handler
app.get('/ws/:projectId', upgradeWebSocket(async (c) => {
  const projectId = c.req.param('projectId');

  return {
    async onOpen(evt, ws) {
      const agent = await agentManager.getOrCreateAgent(projectId);
      agent.addConnection(ws.raw as WebSocket);
      await agent.initializeSandbox();
    },

    async onMessage(evt, ws) {
      const { type, ...data } = JSON.parse(evt.data as string);
      const agent = await agentManager.getOrCreateAgent(projectId);

      switch (type) {
        case 'generate':
          agent.generate(data.description);
          break;
        case 'cancel':
          agent.cancel();
          break;
      }
    },

    async onClose() {
      const agent = agentManager.getAgent(projectId);
      if (agent) {
        agent.removeConnection(ws.raw as WebSocket);
      }
    }
  };
}));

// Graceful shutdown
process.on('SIGINT', async () => {
  await agentManager.shutdown();
  process.exit(0);
});
```
