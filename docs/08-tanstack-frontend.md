# TanStack Start Frontend

The frontend uses TanStack Start for full-stack React with file-based routing.

## Overview

```
┌───────────────────────────────────────────────────────────────────────────┐
│                         TanStack Start App                                 │
│                         localhost:3000                                     │
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                           Routes                                     │  │
│  │                                                                      │  │
│  │   /                    → Landing page                                │  │
│  │   /sign-in             → Login form                                  │  │
│  │   /sign-up             → Registration form                          │  │
│  │   /_authed/chat        → Chat interface (protected)                 │  │
│  │                                                                      │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌─────────────────┐  │
│  │      Components      │  │       Lib            │  │     Config      │  │
│  │                      │  │                      │  │                 │  │
│  │  - ui/               │  │  - db.ts             │  │  - env.ts       │  │
│  │  - chat/             │  │  - auth.ts           │  │                 │  │
│  │                      │  │  - utils.ts          │  │                 │  │
│  └──────────────────────┘  └──────────────────────┘  └─────────────────┘  │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
src/
├── routes/
│   ├── __root.tsx           # Root layout
│   ├── index.tsx            # Landing page
│   ├── sign-in.tsx          # Login
│   ├── sign-up.tsx          # Registration
│   ├── _authed.tsx          # Auth guard layout
│   └── _authed/chat.tsx     # Chat interface
├── components/
│   ├── ui/                  # Shadcn UI components
│   └── chat/                # Chat-specific components
├── lib/
│   ├── db.ts                # Database instance
│   ├── auth.ts              # Better Auth setup
│   └── utils.ts             # Utilities
└── config/
    └── env.ts               # Environment configuration
```

---

## Root Layout

```typescript
// src/routes/__root.tsx

import {
  Outlet,
  ScrollRestoration,
  createRootRouteWithContext,
} from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Meta, Scripts } from '@tanstack/start';
import type { ReactNode } from 'react';

// Styles
import '../styles/globals.css';

interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Code Generator' },
    ],
  }),
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <Meta />
      </head>
      <body className="bg-gray-950 text-gray-100 min-h-screen">
        {children}
        <ScrollRestoration />
        <Scripts />
        {process.env.NODE_ENV === 'development' && <TanStackRouterDevtools />}
      </body>
    </html>
  );
}
```

---

## Authentication Pages

### Login Page

```typescript
// src/routes/sign-in.tsx

import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export const Route = createFileRoute('/login')({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { signIn, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await signIn(email, password);
      navigate({ to: '/dashboard' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-8">Sign In</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 rounded-lg font-medium transition-colors"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-center text-gray-400">
          Don't have an account?{' '}
          <a href="/register" className="text-blue-500 hover:underline">
            Register
          </a>
        </p>
      </div>
    </div>
  );
}
```

---

## Dashboard Page

```typescript
// src/routes/_authed/chat.tsx

import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../lib/api';
import { ProjectCard } from '../components/project/ProjectCard';
import { CreateProjectModal } from '../components/project/CreateProjectModal';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';

export const Route = createFileRoute('/dashboard')({
  component: () => (
    <ProtectedRoute>
      <DashboardPage />
    </ProtectedRoute>
  ),
});

function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Fetch projects
  const { data, isLoading, error } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.getProjects(),
  });

  // Create project mutation
  const createMutation = useMutation({
    mutationFn: (data: { name: string; description: string }) =>
      api.createProject(data),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setShowCreateModal(false);
      navigate({ to: '/project/$id', params: { id: project.id } });
    },
  });

  // Delete project mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500">Failed to load projects</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">My Projects</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
          >
            New Project
          </button>
        </div>

        {data?.projects.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 mb-4">No projects yet</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-blue-500 hover:underline"
            >
              Create your first project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data?.projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onOpen={() => navigate({ to: '/project/$id', params: { id: project.id } })}
                onDelete={() => deleteMutation.mutate(project.id)}
              />
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onCreate={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
        />
      )}
    </div>
  );
}
```

---

## Project Workspace

```typescript
// src/routes/project.$id.tsx

import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { useProjectStore } from '../stores/project';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { FileTree } from '../components/project/FileTree';
import { CodeEditor } from '../components/project/CodeEditor';
import { PreviewFrame } from '../components/project/PreviewFrame';
import { GenerationPanel } from '../components/project/GenerationPanel';
import { useEffect } from 'react';

export const Route = createFileRoute('/project/$id')({
  component: () => (
    <ProtectedRoute>
      <ProjectWorkspace />
    </ProtectedRoute>
  ),
});

function ProjectWorkspace() {
  const { id } = Route.useParams();
  const { files, selectedFile, setSelectedFile, setFiles, currentState } = useProjectStore();

  // Fetch initial project data
  const { data: projectData, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => api.getProject(id),
  });

  // WebSocket connection
  const { isConnected, send } = useWebSocket(id);

  // Initialize files from API
  useEffect(() => {
    if (projectData?.files) {
      const fileMap = new Map(
        projectData.files.map((f) => [f.path, f.content])
      );
      setFiles(fileMap);
    }
  }, [projectData, setFiles]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  const selectedContent = selectedFile ? files.get(selectedFile) || '' : '';

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="h-14 border-b border-gray-800 flex items-center px-4 justify-between">
        <div className="flex items-center gap-4">
          <a href="/dashboard" className="text-gray-400 hover:text-white">
            &larr; Back
          </a>
          <h1 className="font-semibold">{projectData?.project.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          <span className="text-sm text-gray-400">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* File tree sidebar */}
        <aside className="w-64 border-r border-gray-800 overflow-y-auto">
          <FileTree
            files={Array.from(files.keys())}
            selectedFile={selectedFile}
            onSelect={setSelectedFile}
          />
        </aside>

        {/* Code editor */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {selectedFile ? (
            <CodeEditor
              path={selectedFile}
              content={selectedContent}
              language={getLanguage(selectedFile)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              Select a file to view
            </div>
          )}
        </main>

        {/* Right panel */}
        <aside className="w-96 border-l border-gray-800 flex flex-col">
          {/* Generation controls */}
          <GenerationPanel
            projectId={id}
            currentState={currentState}
            onStart={() => send({ type: 'start_generation' })}
            onStop={() => send({ type: 'stop_generation' })}
          />

          {/* Preview iframe */}
          <PreviewFrame projectId={id} />
        </aside>
      </div>
    </div>
  );
}

function getLanguage(path: string): string {
  const ext = path.split('.').pop() || '';
  const langMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    css: 'css',
    html: 'html',
    json: 'json',
    md: 'markdown',
  };
  return langMap[ext] || 'plaintext';
}
```

---

## WebSocket Hook

```typescript
// src/hooks/useWebSocket.ts

import { useEffect, useRef, useCallback, useState } from 'react';
import { useProjectStore } from '../stores/project';
import { useAuth } from './useAuth';

interface WebSocketMessage {
  type: string;
  data?: unknown;
}

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';

export function useWebSocket(projectId: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const { getToken } = useAuth();

  const {
    setCurrentState,
    addFile,
    appendToFile,
    setPreviewUrl,
    addLogMessage,
  } = useProjectStore();

  // Handle incoming messages
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);

      switch (message.type) {
        case 'agent_connected':
          handleAgentConnected(message.data);
          break;

        case 'state_update':
          if (typeof message.data === 'object' && message.data !== null) {
            const data = message.data as { currentState: string };
            setCurrentState(data.currentState);
          }
          break;

        case 'file_start':
          if (typeof message.data === 'object' && message.data !== null) {
            const { path } = message.data as { path: string };
            addFile(path, '');
          }
          break;

        case 'file_chunk':
          if (typeof message.data === 'object' && message.data !== null) {
            const { path, chunk } = message.data as { path: string; chunk: string };
            appendToFile(path, chunk);
          }
          break;

        case 'file_end':
          // File already complete via chunks
          break;

        case 'preview_url':
          if (typeof message.data === 'object' && message.data !== null) {
            const { url } = message.data as { url: string };
            setPreviewUrl(url);
          }
          break;

        case 'sandbox_log':
          if (typeof message.data === 'object' && message.data !== null) {
            const { type, content } = message.data as { type: string; content: string };
            addLogMessage(type, content);
          }
          break;

        case 'generation_error':
          if (typeof message.data === 'object' && message.data !== null) {
            const { message: errorMsg } = message.data as { message: string };
            console.error('Generation error:', errorMsg);
          }
          break;
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }, [setCurrentState, addFile, appendToFile, setPreviewUrl, addLogMessage]);

  const handleAgentConnected = (data: unknown) => {
    if (typeof data === 'object' && data !== null) {
      const state = data as {
        currentState: string;
        generatedFiles: string[];
        previewUrl: string | null;
      };
      setCurrentState(state.currentState);
      if (state.previewUrl) {
        setPreviewUrl(state.previewUrl);
      }
    }
  };

  // Connect to WebSocket
  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const token = await getToken();
    const url = `${WS_URL}/ws/${projectId}?token=${token}`;

    const ws = new WebSocket(url);

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    };

    ws.onmessage = handleMessage;

    ws.onclose = (event) => {
      console.log('WebSocket closed:', event.code);
      setIsConnected(false);

      // Reconnect after delay (unless intentionally closed)
      if (event.code !== 1000) {
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    wsRef.current = ws;
  }, [projectId, handleMessage, getToken]);

  // Send message
  const send = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  // Connect on mount
  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close(1000);
    };
  }, [connect]);

  return { isConnected, send };
}
```

---

## Project Store

```typescript
// src/stores/project.ts

import { create } from 'zustand';

interface LogMessage {
  type: 'stdout' | 'stderr';
  content: string;
  timestamp: Date;
}

interface ProjectState {
  // Files
  files: Map<string, string>;
  selectedFile: string | null;

  // Generation state
  currentState: string;
  currentPhase: number | null;

  // Preview
  previewUrl: string | null;

  // Logs
  logs: LogMessage[];

  // Actions
  setFiles: (files: Map<string, string>) => void;
  addFile: (path: string, content: string) => void;
  appendToFile: (path: string, chunk: string) => void;
  setSelectedFile: (path: string | null) => void;
  setCurrentState: (state: string) => void;
  setCurrentPhase: (phase: number | null) => void;
  setPreviewUrl: (url: string | null) => void;
  addLogMessage: (type: string, content: string) => void;
  clearLogs: () => void;
  reset: () => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  files: new Map(),
  selectedFile: null,
  currentState: 'idle',
  currentPhase: null,
  previewUrl: null,
  logs: [],

  setFiles: (files) => set({ files }),

  addFile: (path, content) => {
    const files = new Map(get().files);
    files.set(path, content);
    set({ files });
  },

  appendToFile: (path, chunk) => {
    const files = new Map(get().files);
    const existing = files.get(path) || '';
    files.set(path, existing + chunk);
    set({ files });
  },

  setSelectedFile: (path) => set({ selectedFile: path }),

  setCurrentState: (state) => set({ currentState: state }),

  setCurrentPhase: (phase) => set({ currentPhase: phase }),

  setPreviewUrl: (url) => set({ previewUrl: url }),

  addLogMessage: (type, content) => {
    const logs = [...get().logs, {
      type: type as 'stdout' | 'stderr',
      content,
      timestamp: new Date(),
    }];
    // Keep last 100 messages
    set({ logs: logs.slice(-100) });
  },

  clearLogs: () => set({ logs: [] }),

  reset: () => set({
    files: new Map(),
    selectedFile: null,
    currentState: 'idle',
    currentPhase: null,
    previewUrl: null,
    logs: [],
  }),
}));
```

---

## API Client

```typescript
// src/lib/api.ts

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  previewUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ProjectFile {
  id: string;
  projectId: string;
  path: string;
  content: string;
}

async function fetchApi<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Request failed: ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Projects
  getProjects: () =>
    fetchApi<{ projects: Project[] }>('/api/projects'),

  getProject: (id: string) =>
    fetchApi<{ project: Project; files: ProjectFile[] }>(`/api/projects/${id}`),

  createProject: (data: { name: string; description: string }) =>
    fetchApi<{ project: Project }>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }).then((res) => res.project),

  deleteProject: (id: string) =>
    fetchApi<{ status: string }>(`/api/projects/${id}`, {
      method: 'DELETE',
    }),

  startGeneration: (id: string) =>
    fetchApi<{ status: string }>(`/api/projects/${id}/generate`, {
      method: 'POST',
    }),

  stopGeneration: (id: string) =>
    fetchApi<{ status: string }>(`/api/projects/${id}/stop`, {
      method: 'POST',
    }),
};
```

---

## Key Components

### File Tree

```typescript
// src/components/project/FileTree.tsx

import { useMemo } from 'react';

interface FileTreeProps {
  files: string[];
  selectedFile: string | null;
  onSelect: (path: string) => void;
}

interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  children: TreeNode[];
}

export function FileTree({ files, selectedFile, onSelect }: FileTreeProps) {
  const tree = useMemo(() => buildTree(files), [files]);

  return (
    <div className="py-2">
      <div className="px-4 py-2 text-sm font-medium text-gray-400 uppercase">
        Files
      </div>
      <TreeNodeComponent
        nodes={tree}
        selectedFile={selectedFile}
        onSelect={onSelect}
        depth={0}
      />
    </div>
  );
}

function TreeNodeComponent({
  nodes,
  selectedFile,
  onSelect,
  depth,
}: {
  nodes: TreeNode[];
  selectedFile: string | null;
  onSelect: (path: string) => void;
  depth: number;
}) {
  return (
    <ul>
      {nodes.map((node) => (
        <li key={node.path}>
          <button
            onClick={() => !node.isFolder && onSelect(node.path)}
            className={`w-full text-left px-4 py-1.5 hover:bg-gray-800 flex items-center gap-2 ${
              selectedFile === node.path ? 'bg-gray-800 text-blue-400' : ''
            }`}
            style={{ paddingLeft: `${depth * 12 + 16}px` }}
          >
            <span className="text-gray-500">
              {node.isFolder ? '>' : getFileIcon(node.name)}
            </span>
            <span className="truncate">{node.name}</span>
          </button>
          {node.isFolder && node.children.length > 0 && (
            <TreeNodeComponent
              nodes={node.children}
              selectedFile={selectedFile}
              onSelect={onSelect}
              depth={depth + 1}
            />
          )}
        </li>
      ))}
    </ul>
  );
}

function buildTree(files: string[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const file of files.sort()) {
    const parts = file.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const isLast = i === parts.length - 1;
      const path = parts.slice(0, i + 1).join('/');

      let node = current.find((n) => n.name === name);

      if (!node) {
        node = {
          name,
          path,
          isFolder: !isLast,
          children: [],
        };
        current.push(node);
      }

      current = node.children;
    }
  }

  return sortTree(root);
}

function sortTree(nodes: TreeNode[]): TreeNode[] {
  return nodes
    .sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      return a.name.localeCompare(b.name);
    })
    .map((node) => ({
      ...node,
      children: sortTree(node.children),
    }));
}

function getFileIcon(name: string): string {
  const ext = name.split('.').pop() || '';
  const icons: Record<string, string> = {
    ts: 'TS',
    tsx: 'TX',
    js: 'JS',
    jsx: 'JX',
    css: '#',
    json: '{}',
    md: 'MD',
  };
  return icons[ext] || '*';
}
```

### Generation Panel

```typescript
// src/components/project/GenerationPanel.tsx

interface GenerationPanelProps {
  projectId: string;
  currentState: string;
  onStart: () => void;
  onStop: () => void;
}

export function GenerationPanel({
  projectId,
  currentState,
  onStart,
  onStop,
}: GenerationPanelProps) {
  const isGenerating = currentState !== 'idle' && currentState !== 'complete';

  return (
    <div className="p-4 border-b border-gray-800">
      <h2 className="text-sm font-medium text-gray-400 mb-4">Generation</h2>

      <div className="mb-4">
        <div className="text-sm text-gray-400 mb-1">Status</div>
        <div className="flex items-center gap-2">
          <StatusIndicator state={currentState} />
          <span className="capitalize">{currentState.replace(/_/g, ' ')}</span>
        </div>
      </div>

      <div className="flex gap-2">
        {!isGenerating ? (
          <button
            onClick={onStart}
            className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
          >
            Start Generation
          </button>
        ) : (
          <button
            onClick={onStop}
            className="flex-1 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors"
          >
            Stop Generation
          </button>
        )}
      </div>
    </div>
  );
}

function StatusIndicator({ state }: { state: string }) {
  const colors: Record<string, string> = {
    idle: 'bg-gray-500',
    designing_phase: 'bg-yellow-500 animate-pulse',
    implementing_phase: 'bg-blue-500 animate-pulse',
    installing_deps: 'bg-purple-500 animate-pulse',
    starting_server: 'bg-orange-500 animate-pulse',
    complete: 'bg-green-500',
    error: 'bg-red-500',
  };

  return (
    <span className={`w-2 h-2 rounded-full ${colors[state] || 'bg-gray-500'}`} />
  );
}
```

### Preview Frame

```typescript
// src/components/project/PreviewFrame.tsx

import { useProjectStore } from '../../stores/project';

interface PreviewFrameProps {
  projectId: string;
}

export function PreviewFrame({ projectId }: PreviewFrameProps) {
  const { previewUrl, logs } = useProjectStore();

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-sm font-medium text-gray-400">Preview</h2>
      </div>

      {previewUrl ? (
        <div className="flex-1 bg-white">
          <iframe
            src={previewUrl}
            className="w-full h-full border-0"
            title="App Preview"
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          {/* Terminal output when no preview */}
          <div className="flex-1 bg-gray-900 p-4 font-mono text-sm overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-gray-500">
                Waiting for generation to start...
              </div>
            ) : (
              logs.map((log, i) => (
                <div
                  key={i}
                  className={log.type === 'stderr' ? 'text-red-400' : 'text-gray-300'}
                >
                  {log.content}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## Auth Hook

```typescript
// src/hooks/useAuth.ts

import { useState, useEffect, useCallback } from 'react';
import { authClient } from '../lib/auth-client';

interface User {
  id: string;
  email: string;
  name: string | null;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Check session on mount
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const session = await authClient.getSession();
      if (session?.user) {
        setState({
          user: session.user,
          isLoading: false,
          isAuthenticated: true,
        });
      } else {
        setState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    } catch {
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  };

  const signIn = async (email: string, password: string) => {
    setState((s) => ({ ...s, isLoading: true }));
    try {
      const result = await authClient.signIn.email({ email, password });
      if (result.user) {
        setState({
          user: result.user,
          isLoading: false,
          isAuthenticated: true,
        });
      }
    } catch (error) {
      setState((s) => ({ ...s, isLoading: false }));
      throw error;
    }
  };

  const signUp = async (email: string, password: string, name?: string) => {
    setState((s) => ({ ...s, isLoading: true }));
    try {
      const result = await authClient.signUp.email({ email, password, name });
      if (result.user) {
        setState({
          user: result.user,
          isLoading: false,
          isAuthenticated: true,
        });
      }
    } catch (error) {
      setState((s) => ({ ...s, isLoading: false }));
      throw error;
    }
  };

  const signOut = async () => {
    await authClient.signOut();
    setState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    });
  };

  const getToken = useCallback(async () => {
    const session = await authClient.getSession();
    return session?.session?.token || '';
  }, []);

  return {
    ...state,
    signIn,
    signUp,
    signOut,
    getToken,
  };
}
```

---

## Environment Variables

```bash
# .env (root)
VITE_APP_NAME=minicode
VITE_APP_URL=http://localhost:3000
```
