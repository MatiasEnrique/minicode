# Authentication (Better Auth)

Better Auth provides a simple, type-safe authentication system.

## Overview

```
┌───────────────────────────────────────────────────────────────────────────┐
│                         Authentication Flow                                │
│                                                                            │
│   ┌─────────────┐                              ┌─────────────────────┐    │
│   │   Client    │                              │      Server         │    │
│   │  (Browser)  │                              │      (Elysia)       │    │
│   └──────┬──────┘                              └──────────┬──────────┘    │
│          │                                                │               │
│          │  POST /api/auth/sign-in                        │               │
│          │  { email, password }                           │               │
│          │───────────────────────────────────────────────>│               │
│          │                                                │               │
│          │                                                │  Verify       │
│          │                                                │  credentials  │
│          │                                                │       │       │
│          │                                                │       ▼       │
│          │                                                │  Create       │
│          │                                                │  session      │
│          │                                                │       │       │
│          │  Set-Cookie: session=xxx                       │       │       │
│          │<───────────────────────────────────────────────│       │       │
│          │  { user, session }                             │               │
│          │                                                │               │
│          │  GET /api/projects (with cookie)               │               │
│          │───────────────────────────────────────────────>│               │
│          │                                                │  Validate     │
│          │                                                │  session      │
│          │  200 { projects: [...] }                       │               │
│          │<───────────────────────────────────────────────│               │
│          │                                                │               │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## Installation

```bash
bun add better-auth
```

---

## Server Configuration

### Auth Instance

```typescript
// shared/auth/index.ts

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db';

export const auth = betterAuth({
  // Database adapter
  database: drizzleAdapter(db, {
    provider: 'pg',
  }),

  // Email/password auth
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },

  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session every 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },

  // Security settings
  advanced: {
    cookiePrefix: 'codegen',
    useSecureCookies: process.env.NODE_ENV === 'production',
  },

  // Trusted origins
  trustedOrigins: [
    'http://localhost:3000',
    'http://localhost:3001',
  ],
});

export type Auth = typeof auth;
```

### Auth Routes

```typescript
// server/routes/auth.ts

import { Elysia } from 'elysia';
import { auth } from '../auth';

const app = new Elysia();

// Mount all Better Auth routes
app.on(['GET', 'POST'], '/*', (c) => {
  return auth.handler(c.req.raw);
});

export { app as authRoutes };
```

### Auth Middleware

```typescript
// server/middleware/auth.ts

import { Elysia } from 'elysia';
import { auth } from '../auth';

export interface AuthContext {
  userId: string;
  sessionId: string;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
}

/**
 * Protect routes with session validation
 */
export function authMiddleware() {
  return createMiddleware<{ Variables: AuthContext }>(async (c, next) => {
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    if (!session || !session.user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Set context variables
    c.set('userId', session.user.id);
    c.set('sessionId', session.session.id);
    c.set('user', {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    });

    await next();
  });
}

/**
 * Optional auth - doesn't fail if not authenticated
 */
export function optionalAuthMiddleware() {
  return createMiddleware<{ Variables: Partial<AuthContext> }>(async (c, next) => {
    try {
      const session = await auth.api.getSession({
        headers: c.req.raw.headers,
      });

      if (session?.user) {
        c.set('userId', session.user.id);
        c.set('sessionId', session.session.id);
        c.set('user', {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
        });
      }
    } catch {
      // Session invalid or expired
    }

    await next();
  });
}

/**
 * Verify WebSocket authentication token
 */
export async function verifyWebSocketAuth(
  token: string | undefined
): Promise<{ userId: string; sessionId: string } | null> {
  if (!token) return null;

  try {
    // Create headers with the token
    const headers = new Headers({
      Cookie: `codegen.session_token=${token}`,
    });

    const session = await auth.api.getSession({ headers });

    if (!session?.user) return null;

    return {
      userId: session.user.id,
      sessionId: session.session.id,
    };
  } catch {
    return null;
  }
}
```

---

## Client Configuration

### Auth Client

```typescript
// src/lib/auth-client.ts

import { createAuthClient } from 'better-auth/react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const authClient = createAuthClient({
  baseURL: API_URL,
  credentials: 'include', // Send cookies with requests
});

// Re-export methods for convenience
export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient;
```

### Auth Hook

```typescript
// src/hooks/useAuth.ts

import { useState, useEffect, useCallback } from 'react';
import { authClient } from '../lib/auth-client';
import { useNavigate } from '@tanstack/react-router';

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
  const navigate = useNavigate();
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
      const { data } = await authClient.getSession();

      if (data?.user) {
        setState({
          user: data.user,
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

    const { data, error } = await authClient.signIn.email({
      email,
      password,
    });

    if (error) {
      setState((s) => ({ ...s, isLoading: false }));
      throw new Error(error.message || 'Sign in failed');
    }

    if (data?.user) {
      setState({
        user: data.user,
        isLoading: false,
        isAuthenticated: true,
      });
    }

    return data;
  };

  const signUp = async (email: string, password: string, name?: string) => {
    setState((s) => ({ ...s, isLoading: true }));

    const { data, error } = await authClient.signUp.email({
      email,
      password,
      name: name || '',
    });

    if (error) {
      setState((s) => ({ ...s, isLoading: false }));
      throw new Error(error.message || 'Sign up failed');
    }

    if (data?.user) {
      setState({
        user: data.user,
        isLoading: false,
        isAuthenticated: true,
      });
    }

    return data;
  };

  const signOut = async () => {
    await authClient.signOut();
    setState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    });
    navigate({ to: '/login' });
  };

  // Get session token for WebSocket auth
  const getSessionToken = useCallback(async (): Promise<string | null> => {
    try {
      const { data } = await authClient.getSession();
      return data?.session?.token || null;
    } catch {
      return null;
    }
  }, []);

  return {
    ...state,
    signIn,
    signUp,
    signOut,
    getSessionToken,
    checkSession,
  };
}
```

---

## Protected Routes

### Route Guard Component

```typescript
// src/components/auth/ProtectedRoute.tsx

import { useAuth } from '../../hooks/useAuth';
import { Navigate, useLocation } from '@tanstack/react-router';
import type { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        search={{ redirect: location.pathname }}
      />
    );
  }

  return <>{children}</>;
}
```

### Using in Routes

```typescript
// src/routes/_authed/chat.tsx

import { createFileRoute } from '@tanstack/react-router';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';

export const Route = createFileRoute('/dashboard')({
  component: () => (
    <ProtectedRoute>
      <DashboardPage />
    </ProtectedRoute>
  ),
});

function DashboardPage() {
  // This only renders when authenticated
  return <div>Dashboard content</div>;
}
```

---

## Auth Components

### Login Form

```typescript
// src/components/auth/LoginForm.tsx

import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate, useSearch } from '@tanstack/react-router';

export function LoginForm() {
  const navigate = useNavigate();
  const search = useSearch({ from: '/login' });
  const { signIn, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await signIn(email, password);
      // Redirect to original destination or dashboard
      const redirect = (search as { redirect?: string }).redirect || '/dashboard';
      navigate({ to: redirect });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  return (
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
          autoComplete="email"
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
          autoComplete="current-password"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
      >
        {isLoading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  );
}
```

### Register Form

```typescript
// src/components/auth/RegisterForm.tsx

import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from '@tanstack/react-router';

export function RegisterForm() {
  const navigate = useNavigate();
  const { signUp, isLoading } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password length
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    try {
      await signUp(email, password, name);
      navigate({ to: '/dashboard' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-2">
          Name
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          autoComplete="name"
        />
      </div>

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
          autoComplete="email"
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
          minLength={8}
          autoComplete="new-password"
        />
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
          Confirm Password
        </label>
        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
          autoComplete="new-password"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
      >
        {isLoading ? 'Creating account...' : 'Create Account'}
      </button>
    </form>
  );
}
```

### User Menu

```typescript
// src/components/auth/UserMenu.tsx

import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

export function UserMenu() {
  const { user, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  if (!user) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
          {user.name?.[0] || user.email[0].toUpperCase()}
        </div>
        <span className="hidden sm:block">{user.name || user.email}</span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-gray-800 rounded-lg shadow-lg z-20">
            <div className="p-3 border-b border-gray-800">
              <div className="font-medium">{user.name || 'User'}</div>
              <div className="text-sm text-gray-400 truncate">{user.email}</div>
            </div>
            <div className="p-1">
              <button
                onClick={() => {
                  setIsOpen(false);
                  signOut();
                }}
                className="w-full text-left px-3 py-2 text-red-400 hover:bg-gray-800 rounded-md transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
```

---

## WebSocket Authentication

### Server-side

```typescript
// server/websocket/auth.ts

import { verifyWebSocketAuth } from '../middleware/auth';
import type { WSContext } from 'elysia/ws';

export async function authenticateWebSocket(
  ws: WSContext,
  token: string | undefined
): Promise<{ userId: string; sessionId: string } | null> {
  const authResult = await verifyWebSocketAuth(token);

  if (!authResult) {
    ws.close(4001, 'Unauthorized');
    return null;
  }

  return authResult;
}
```

### Client-side

```typescript
// src/hooks/useWebSocket.ts

import { useAuth } from './useAuth';

export function useWebSocket(projectId: string) {
  const { getSessionToken } = useAuth();

  const connect = useCallback(async () => {
    // Get session token for WebSocket auth
    const token = await getSessionToken();

    if (!token) {
      console.error('No session token available');
      return;
    }

    const url = `${WS_URL}/ws/${projectId}?token=${token}`;
    const ws = new WebSocket(url);

    // ... rest of connection logic
  }, [projectId, getSessionToken]);

  // ...
}
```

---

## OAuth Providers (Optional)

```typescript
// shared/auth/index.ts

import { betterAuth } from 'better-auth';
import { github, google } from 'better-auth/providers';

export const auth = betterAuth({
  // ... other config

  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
});
```

### OAuth Button

```typescript
// src/components/auth/OAuthButtons.tsx

import { authClient } from '../../lib/auth-client';

export function OAuthButtons() {
  return (
    <div className="space-y-3">
      <button
        onClick={() => authClient.signIn.social({ provider: 'github' })}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
      >
        <GitHubIcon className="w-5 h-5" />
        Continue with GitHub
      </button>

      <button
        onClick={() => authClient.signIn.social({ provider: 'google' })}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
      >
        <GoogleIcon className="w-5 h-5" />
        Continue with Google
      </button>
    </div>
  );
}
```

---

## Environment Variables

```bash
# Server
BETTER_AUTH_SECRET=your-secret-key-at-least-32-characters-long
BETTER_AUTH_URL=http://localhost:3001

# OAuth (optional)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

---

## Security Best Practices

1. **Secret Key**: Use a strong, random secret key (32+ characters)
2. **HTTPS**: Always use HTTPS in production
3. **CORS**: Restrict origins to your frontend domain
4. **Cookie Settings**: Use secure cookies in production
5. **Password Requirements**: Enforce minimum length and complexity
6. **Rate Limiting**: Add rate limiting to auth endpoints
7. **Token Rotation**: Sessions are automatically rotated

```typescript
// Rate limiting middleware
import { rateLimit } from 'elysia-rate-limit';

app.use('/api/auth/*', rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // 100 requests per window
  standardHeaders: true,
}));
```
