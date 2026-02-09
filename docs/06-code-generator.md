# Code Generator (Multi-Provider AI)

The code generator supports multiple AI providers through a unified interface, allowing you to switch between providers or use different providers for different tasks.

## Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Code Generator                                    │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                     AI Provider Interface                          │ │
│  │                                                                    │ │
│  │   designPhase()     →  Structured JSON output                      │ │
│  │   implementPhase()  →  Streaming code generation                   │ │
│  │                                                                    │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                    │                                     │
│                    ┌───────────────┼───────────────┐                     │
│                    ▼               ▼               ▼                     │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────────────┐ │
│  │   Vercel AI SDK  │ │  Direct APIs     │ │  Cloudflare AI           │ │
│  │                  │ │                  │ │                          │ │
│  │  - OpenAI        │ │  - OpenAI        │ │  - Workers AI            │ │
│  │  - Anthropic     │ │  - Anthropic     │ │  - @cf/meta/llama        │ │
│  │  - Google        │ │  - Google        │ │  - @hf/models            │ │
│  │  - OpenRouter    │ │  - OpenRouter    │ │                          │ │
│  └──────────────────┘ └──────────────────┘ └──────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Supported Providers

| Provider | Best For | Streaming | JSON Mode |
|----------|----------|-----------|-----------|
| **OpenAI** | GPT-4, GPT-4o | Yes | Yes |
| **Anthropic** | Claude 3.5, Claude 3 | Yes | Yes |
| **Google** | Gemini Pro, Gemini Flash | Yes | Yes |
| **OpenRouter** | Multi-model gateway | Yes | Yes |
| **Vercel AI** | Unified SDK | Yes | Yes |
| **Cloudflare AI** | Edge inference | Yes | Limited |

---

## Installation

```bash
# Core dependencies
bun add ai  # Vercel AI SDK

# Provider-specific SDKs
bun add @ai-sdk/openai      # OpenAI
bun add @ai-sdk/anthropic   # Anthropic/Claude
bun add @ai-sdk/google      # Google/Gemini
bun add openai              # Direct OpenAI API
bun add @anthropic-ai/sdk   # Direct Anthropic API
bun add @google/generative-ai  # Direct Google API
```

---

## Type Definitions

```typescript
// server/generator/types.ts

export type ProviderType =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'openrouter'
  | 'cloudflare'
  | 'vercel-ai';

export interface ProviderConfig {
  provider: ProviderType;
  apiKey: string;
  model: string;
  baseUrl?: string;  // For OpenRouter or custom endpoints
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

export interface GenerationCallbacks {
  onFileStart: (path: string) => void;
  onFileChunk: (path: string, chunk: string) => void;
  onFileEnd: (path: string, content: string) => void;
}

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GenerationOptions {
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
}
```

---

## Provider Configuration

```typescript
// server/generator/config.ts

import type { ProviderConfig, ProviderType } from './types';

// Model presets for each provider
export const MODELS = {
  // OpenAI
  'gpt-4o': { provider: 'openai' as const, model: 'gpt-4o' },
  'gpt-4-turbo': { provider: 'openai' as const, model: 'gpt-4-turbo' },
  'gpt-4o-mini': { provider: 'openai' as const, model: 'gpt-4o-mini' },

  // Anthropic
  'claude-3.5-sonnet': { provider: 'anthropic' as const, model: 'claude-3-5-sonnet-20241022' },
  'claude-3-opus': { provider: 'anthropic' as const, model: 'claude-3-opus-20240229' },
  'claude-3-haiku': { provider: 'anthropic' as const, model: 'claude-3-haiku-20240307' },

  // Google
  'gemini-pro': { provider: 'google' as const, model: 'gemini-1.5-pro' },
  'gemini-flash': { provider: 'google' as const, model: 'gemini-1.5-flash' },
  'gemini-2-flash': { provider: 'google' as const, model: 'gemini-2.0-flash-exp' },

  // OpenRouter (any model)
  'openrouter-claude': { provider: 'openrouter' as const, model: 'anthropic/claude-3.5-sonnet' },
  'openrouter-gpt4': { provider: 'openrouter' as const, model: 'openai/gpt-4-turbo' },
  'openrouter-llama': { provider: 'openrouter' as const, model: 'meta-llama/llama-3.1-70b-instruct' },

  // Cloudflare
  'cf-llama': { provider: 'cloudflare' as const, model: '@cf/meta/llama-3.1-70b-instruct' },
} as const;

export type ModelPreset = keyof typeof MODELS;

// Get config from environment
export function getProviderConfig(preset: ModelPreset): ProviderConfig {
  const modelConfig = MODELS[preset];

  switch (modelConfig.provider) {
    case 'openai':
      return {
        provider: 'openai',
        apiKey: getEnvVar('OPENAI_API_KEY'),
        model: modelConfig.model,
      };

    case 'anthropic':
      return {
        provider: 'anthropic',
        apiKey: getEnvVar('ANTHROPIC_API_KEY'),
        model: modelConfig.model,
      };

    case 'google':
      return {
        provider: 'google',
        apiKey: getEnvVar('GOOGLE_API_KEY'),
        model: modelConfig.model,
      };

    case 'openrouter':
      return {
        provider: 'openrouter',
        apiKey: getEnvVar('OPENROUTER_API_KEY'),
        model: modelConfig.model,
        baseUrl: 'https://openrouter.ai/api/v1',
      };

    case 'cloudflare':
      return {
        provider: 'cloudflare',
        apiKey: getEnvVar('CLOUDFLARE_API_TOKEN'),
        model: modelConfig.model,
        baseUrl: `https://api.cloudflare.com/client/v4/accounts/${getEnvVar('CLOUDFLARE_ACCOUNT_ID')}/ai/run`,
      };

    default:
      throw new Error(`Unknown provider: ${modelConfig.provider}`);
  }
}

function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}
```

---

## Unified Provider Interface

```typescript
// server/generator/provider.ts

import type {
  ProviderConfig,
  Message,
  GenerationOptions,
} from './types';

export interface AIProvider {
  /**
   * Generate a completion (non-streaming)
   */
  complete(
    messages: Message[],
    options?: GenerationOptions
  ): Promise<string>;

  /**
   * Generate a streaming completion
   */
  stream(
    messages: Message[],
    onChunk: (chunk: string) => void,
    options?: GenerationOptions
  ): Promise<string>;

  /**
   * Generate structured JSON output
   */
  json<T>(
    messages: Message[],
    options?: GenerationOptions
  ): Promise<T>;
}

/**
 * Create provider instance based on config
 */
export function createProvider(config: ProviderConfig): AIProvider {
  switch (config.provider) {
    case 'openai':
      return new OpenAIProvider(config);
    case 'anthropic':
      return new AnthropicProvider(config);
    case 'google':
      return new GoogleProvider(config);
    case 'openrouter':
      return new OpenRouterProvider(config);
    case 'cloudflare':
      return new CloudflareProvider(config);
    case 'vercel-ai':
      return new VercelAIProvider(config);
    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
}
```

---

## OpenAI Provider

```typescript
// server/generator/providers/openai.ts

import OpenAI from 'openai';
import type { AIProvider, ProviderConfig, Message, GenerationOptions } from '../types';

export class OpenAIProvider implements AIProvider {
  private client: OpenAI;
  private model: string;

  constructor(config: ProviderConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });
    this.model = config.model;
  }

  async complete(messages: Message[], options?: GenerationOptions): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
      max_tokens: options?.maxTokens ?? 4096,
      temperature: options?.temperature ?? 0.7,
    });

    return response.choices[0]?.message?.content ?? '';
  }

  async stream(
    messages: Message[],
    onChunk: (chunk: string) => void,
    options?: GenerationOptions
  ): Promise<string> {
    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages,
      max_tokens: options?.maxTokens ?? 16000,
      temperature: options?.temperature ?? 0.7,
      stream: true,
    });

    let fullContent = '';

    for await (const chunk of stream) {
      if (options?.signal?.aborted) break;

      const content = chunk.choices[0]?.delta?.content ?? '';
      if (content) {
        fullContent += content;
        onChunk(content);
      }
    }

    return fullContent;
  }

  async json<T>(messages: Message[], options?: GenerationOptions): Promise<T> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
      max_tokens: options?.maxTokens ?? 4096,
      temperature: options?.temperature ?? 0.7,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content ?? '{}';
    return JSON.parse(content) as T;
  }
}
```

---

## Anthropic Provider

```typescript
// server/generator/providers/anthropic.ts

import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider, ProviderConfig, Message, GenerationOptions } from '../types';

export class AnthropicProvider implements AIProvider {
  private client: Anthropic;
  private model: string;

  constructor(config: ProviderConfig) {
    this.client = new Anthropic({
      apiKey: config.apiKey,
    });
    this.model = config.model;
  }

  async complete(messages: Message[], options?: GenerationOptions): Promise<string> {
    const { system, userMessages } = this.formatMessages(messages);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: options?.maxTokens ?? 4096,
      system,
      messages: userMessages,
    });

    return response.content[0].type === 'text' ? response.content[0].text : '';
  }

  async stream(
    messages: Message[],
    onChunk: (chunk: string) => void,
    options?: GenerationOptions
  ): Promise<string> {
    const { system, userMessages } = this.formatMessages(messages);

    const stream = this.client.messages.stream({
      model: this.model,
      max_tokens: options?.maxTokens ?? 16000,
      system,
      messages: userMessages,
    });

    let fullContent = '';

    for await (const event of stream) {
      if (options?.signal?.aborted) break;

      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        const content = event.delta.text;
        fullContent += content;
        onChunk(content);
      }
    }

    return fullContent;
  }

  async json<T>(messages: Message[], options?: GenerationOptions): Promise<T> {
    // Claude doesn't have native JSON mode, so we instruct it in the prompt
    const jsonMessages = [...messages];
    const lastMessage = jsonMessages[jsonMessages.length - 1];
    if (lastMessage.role === 'user') {
      lastMessage.content += '\n\nRespond with valid JSON only. No other text.';
    }

    const content = await this.complete(jsonMessages, options);

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) ||
                      content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;

    return JSON.parse(jsonStr) as T;
  }

  private formatMessages(messages: Message[]): {
    system: string;
    userMessages: Array<{ role: 'user' | 'assistant'; content: string }>;
  } {
    const systemMessages = messages.filter((m) => m.role === 'system');
    const userMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    return {
      system: systemMessages.map((m) => m.content).join('\n\n'),
      userMessages,
    };
  }
}
```

---

## Google Provider

```typescript
// server/generator/providers/google.ts

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AIProvider, ProviderConfig, Message, GenerationOptions } from '../types';

export class GoogleProvider implements AIProvider {
  private client: GoogleGenerativeAI;
  private model: string;

  constructor(config: ProviderConfig) {
    this.client = new GoogleGenerativeAI(config.apiKey);
    this.model = config.model;
  }

  async complete(messages: Message[], options?: GenerationOptions): Promise<string> {
    const model = this.client.getGenerativeModel({ model: this.model });
    const { history, lastMessage } = this.formatMessages(messages);

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(lastMessage);

    return result.response.text();
  }

  async stream(
    messages: Message[],
    onChunk: (chunk: string) => void,
    options?: GenerationOptions
  ): Promise<string> {
    const model = this.client.getGenerativeModel({ model: this.model });
    const { history, lastMessage } = this.formatMessages(messages);

    const chat = model.startChat({ history });
    const result = await chat.sendMessageStream(lastMessage);

    let fullContent = '';

    for await (const chunk of result.stream) {
      if (options?.signal?.aborted) break;

      const content = chunk.text();
      if (content) {
        fullContent += content;
        onChunk(content);
      }
    }

    return fullContent;
  }

  async json<T>(messages: Message[], options?: GenerationOptions): Promise<T> {
    const model = this.client.getGenerativeModel({
      model: this.model,
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const { history, lastMessage } = this.formatMessages(messages);
    const chat = model.startChat({ history });
    const result = await chat.sendMessage(lastMessage);

    return JSON.parse(result.response.text()) as T;
  }

  private formatMessages(messages: Message[]): {
    history: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>;
    lastMessage: string;
  } {
    // Combine system message with first user message
    const systemContent = messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n\n');

    const nonSystemMessages = messages.filter((m) => m.role !== 'system');

    // Add system content to first user message
    if (systemContent && nonSystemMessages.length > 0 && nonSystemMessages[0].role === 'user') {
      nonSystemMessages[0] = {
        ...nonSystemMessages[0],
        content: `${systemContent}\n\n${nonSystemMessages[0].content}`,
      };
    }

    const history = nonSystemMessages.slice(0, -1).map((m) => ({
      role: (m.role === 'assistant' ? 'model' : 'user') as 'user' | 'model',
      parts: [{ text: m.content }],
    }));

    const lastMessage = nonSystemMessages[nonSystemMessages.length - 1]?.content ?? '';

    return { history, lastMessage };
  }
}
```

---

## OpenRouter Provider

```typescript
// server/generator/providers/openrouter.ts

import type { AIProvider, ProviderConfig, Message, GenerationOptions } from '../types';

export class OpenRouterProvider implements AIProvider {
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(config: ProviderConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model;
    this.baseUrl = config.baseUrl ?? 'https://openrouter.ai/api/v1';
  }

  async complete(messages: Message[], options?: GenerationOptions): Promise<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        model: this.model,
        messages,
        max_tokens: options?.maxTokens ?? 4096,
        temperature: options?.temperature ?? 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content ?? '';
  }

  async stream(
    messages: Message[],
    onChunk: (chunk: string) => void,
    options?: GenerationOptions
  ): Promise<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        model: this.model,
        messages,
        max_tokens: options?.maxTokens ?? 16000,
        temperature: options?.temperature ?? 0.7,
        stream: true,
      }),
      signal: options?.signal,
    });

    if (!response.ok) {
      throw new Error(`OpenRouter error: ${response.status}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullContent += content;
              onChunk(content);
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }

    return fullContent;
  }

  async json<T>(messages: Message[], options?: GenerationOptions): Promise<T> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        model: this.model,
        messages,
        max_tokens: options?.maxTokens ?? 4096,
        temperature: options?.temperature ?? 0.7,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content ?? '{}';
    return JSON.parse(content) as T;
  }

  private getHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'Local Code Generator',
    };
  }
}
```

---

## Cloudflare AI Provider

```typescript
// server/generator/providers/cloudflare.ts

import type { AIProvider, ProviderConfig, Message, GenerationOptions } from '../types';

export class CloudflareProvider implements AIProvider {
  private apiToken: string;
  private model: string;
  private baseUrl: string;

  constructor(config: ProviderConfig) {
    this.apiToken = config.apiKey;
    this.model = config.model;
    this.baseUrl = config.baseUrl!;
  }

  async complete(messages: Message[], options?: GenerationOptions): Promise<string> {
    const response = await fetch(`${this.baseUrl}/${this.model}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        messages: this.formatMessages(messages),
        max_tokens: options?.maxTokens ?? 4096,
      }),
    });

    if (!response.ok) {
      throw new Error(`Cloudflare AI error: ${response.status}`);
    }

    const data = await response.json();
    return data.result?.response ?? '';
  }

  async stream(
    messages: Message[],
    onChunk: (chunk: string) => void,
    options?: GenerationOptions
  ): Promise<string> {
    const response = await fetch(`${this.baseUrl}/${this.model}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        messages: this.formatMessages(messages),
        max_tokens: options?.maxTokens ?? 16000,
        stream: true,
      }),
      signal: options?.signal,
    });

    if (!response.ok) {
      throw new Error(`Cloudflare AI error: ${response.status}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.response;
            if (content) {
              fullContent += content;
              onChunk(content);
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }

    return fullContent;
  }

  async json<T>(messages: Message[], options?: GenerationOptions): Promise<T> {
    // Cloudflare AI doesn't have native JSON mode
    const jsonMessages = [...messages];
    const lastMessage = jsonMessages[jsonMessages.length - 1];
    if (lastMessage.role === 'user') {
      lastMessage.content += '\n\nRespond with valid JSON only. No other text.';
    }

    const content = await this.complete(jsonMessages, options);
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch?.[0] ?? '{}') as T;
  }

  private getHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
    };
  }

  private formatMessages(messages: Message[]): Array<{ role: string; content: string }> {
    // Cloudflare AI expects 'system', 'user', 'assistant' roles
    return messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
  }
}
```

---

## Vercel AI SDK Provider

```typescript
// server/generator/providers/vercel-ai.ts

import { generateText, streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import type { AIProvider, ProviderConfig, Message, GenerationOptions } from '../types';

export class VercelAIProvider implements AIProvider {
  private model: ReturnType<typeof openai | typeof anthropic | typeof google>;

  constructor(config: ProviderConfig) {
    this.model = this.createModel(config);
  }

  private createModel(config: ProviderConfig) {
    switch (config.provider) {
      case 'openai':
        return openai(config.model);
      case 'anthropic':
        return anthropic(config.model);
      case 'google':
        return google(config.model);
      default:
        return openai(config.model); // Default to OpenAI
    }
  }

  async complete(messages: Message[], options?: GenerationOptions): Promise<string> {
    const { text } = await generateText({
      model: this.model,
      messages: this.formatMessages(messages),
      maxTokens: options?.maxTokens ?? 4096,
      temperature: options?.temperature ?? 0.7,
    });

    return text;
  }

  async stream(
    messages: Message[],
    onChunk: (chunk: string) => void,
    options?: GenerationOptions
  ): Promise<string> {
    const { textStream, text } = await streamText({
      model: this.model,
      messages: this.formatMessages(messages),
      maxTokens: options?.maxTokens ?? 16000,
      temperature: options?.temperature ?? 0.7,
      abortSignal: options?.signal,
    });

    for await (const chunk of textStream) {
      onChunk(chunk);
    }

    return await text;
  }

  async json<T>(messages: Message[], options?: GenerationOptions): Promise<T> {
    const { text } = await generateText({
      model: this.model,
      messages: this.formatMessages(messages),
      maxTokens: options?.maxTokens ?? 4096,
      temperature: options?.temperature ?? 0.7,
    });

    // Extract JSON from response
    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;

    return JSON.parse(jsonStr) as T;
  }

  private formatMessages(messages: Message[]) {
    return messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
  }
}
```

---

## Code Generator Implementation

```typescript
// server/generator/code-generator.ts

import { createProvider, type AIProvider } from './provider';
import { getProviderConfig, type ModelPreset } from './config';
import type { Phase, GenerationCallbacks, Message, GenerationOptions } from './types';
import { parseChunk, createStreamingState, getFormatInstructions } from '../parser';

// System prompts
const DESIGN_SYSTEM_PROMPT = `You are a senior software architect designing a React application.
Your task is to design the next development phase.

IMPORTANT: Return ONLY valid JSON with this exact structure:
{
  "name": "Phase name (2-4 words)",
  "description": "What this phase accomplishes (1-2 sentences)",
  "files": [
    { "path": "src/components/Example.tsx", "purpose": "Brief description" }
  ],
  "isLastPhase": false
}

Guidelines:
- Focus on ONE coherent feature or layer per phase
- Use TypeScript (.tsx for React components, .ts for utilities)
- Follow React best practices (functional components, hooks)
- Maximum 5-7 files per phase
- Set isLastPhase to true when the app is functionally complete`;

const IMPLEMENT_SYSTEM_PROMPT = `You are a senior React/TypeScript developer.
Generate complete, production-ready code for the requested files.

${getFormatInstructions()}

Code Quality Requirements:
- Use TypeScript with proper types (no 'any')
- Use functional components with hooks
- Handle loading and error states where appropriate
- Use Tailwind CSS for all styling
- Follow React best practices
- Include all necessary imports`;

export class CodeGenerator {
  private provider: AIProvider;
  private designProvider: AIProvider;

  constructor(
    implementModel: ModelPreset = 'claude-3.5-sonnet',
    designModel: ModelPreset = 'gpt-4o'
  ) {
    // Use different models for design vs implementation
    this.provider = createProvider(getProviderConfig(implementModel));
    this.designProvider = createProvider(getProviderConfig(designModel));
  }

  /**
   * Create a code generator with custom provider configs
   */
  static withConfigs(
    implementConfig: ReturnType<typeof getProviderConfig>,
    designConfig?: ReturnType<typeof getProviderConfig>
  ): CodeGenerator {
    const generator = new CodeGenerator();
    generator.provider = createProvider(implementConfig);
    generator.designProvider = createProvider(designConfig ?? implementConfig);
    return generator;
  }

  /**
   * Design the next development phase
   */
  async designPhase(
    projectDescription: string,
    existingFiles: string[],
    previousPhases: Phase[]
  ): Promise<Phase> {
    const userPrompt = this.buildDesignPrompt(projectDescription, existingFiles, previousPhases);

    const messages: Message[] = [
      { role: 'system', content: DESIGN_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ];

    const phase = await this.designProvider.json<Phase>(messages);
    this.validatePhase(phase);
    return phase;
  }

  /**
   * Implement a phase by generating code files
   */
  async implementPhase(
    phase: Phase,
    existingFiles: Map<string, { content: string }>,
    callbacks: GenerationCallbacks,
    options?: GenerationOptions
  ): Promise<Map<string, { filePath: string; content: string }>> {
    const userPrompt = this.buildImplementPrompt(phase, existingFiles);

    const messages: Message[] = [
      { role: 'system', content: IMPLEMENT_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ];

    const streamState = createStreamingState();

    await this.provider.stream(
      messages,
      (chunk) => {
        parseChunk(chunk, streamState, callbacks);
      },
      options
    );

    return streamState.completedFiles;
  }

  private buildDesignPrompt(
    description: string,
    existingFiles: string[],
    previousPhases: Phase[]
  ): string {
    let prompt = `Project Description: ${description}\n\n`;

    if (existingFiles.length > 0) {
      prompt += `Existing files:\n${existingFiles.map((f) => `- ${f}`).join('\n')}\n\n`;
    } else {
      prompt += 'No files yet (this is the first phase).\n\n';
    }

    if (previousPhases.length > 0) {
      prompt += `Previous phases:\n`;
      prompt += previousPhases
        .map((p, i) => `${i + 1}. ${p.name}: ${p.description}`)
        .join('\n');
      prompt += '\n\n';
    }

    prompt += 'Design the next phase. Return JSON only.';
    return prompt;
  }

  private buildImplementPrompt(
    phase: Phase,
    existingFiles: Map<string, { content: string }>
  ): string {
    let prompt = `Phase: ${phase.name}\n`;
    prompt += `Description: ${phase.description}\n\n`;

    prompt += `Files to generate:\n`;
    for (const file of phase.files) {
      prompt += `- ${file.path}: ${file.purpose}\n`;
    }
    prompt += '\n';

    if (existingFiles.size > 0) {
      prompt += `Existing files for reference:\n\n`;

      for (const [path, file] of existingFiles) {
        const content = file.content.length > 2000
          ? file.content.slice(0, 2000) + '\n... (truncated)'
          : file.content;

        prompt += `### ${path}\n\`\`\`tsx\n${content}\n\`\`\`\n\n`;
      }
    }

    prompt += `Generate all files using the specified format.`;
    return prompt;
  }

  private validatePhase(phase: Phase): void {
    if (!phase.name || typeof phase.name !== 'string') {
      throw new Error('Phase must have a name');
    }
    if (!phase.description || typeof phase.description !== 'string') {
      throw new Error('Phase must have a description');
    }
    if (!Array.isArray(phase.files) || phase.files.length === 0) {
      throw new Error('Phase must have at least one file');
    }
    if (typeof phase.isLastPhase !== 'boolean') {
      phase.isLastPhase = false;
    }
  }
}
```

---

## Provider Index

```typescript
// server/generator/providers/index.ts

export { OpenAIProvider } from './openai';
export { AnthropicProvider } from './anthropic';
export { GoogleProvider } from './google';
export { OpenRouterProvider } from './openrouter';
export { CloudflareProvider } from './cloudflare';
export { VercelAIProvider } from './vercel-ai';
```

---

## Usage Examples

### Basic Usage

```typescript
import { CodeGenerator } from './generator';

// Use Claude for implementation, GPT-4 for design
const generator = new CodeGenerator('claude-3.5-sonnet', 'gpt-4o');

// Design a phase
const phase = await generator.designPhase(
  'A todo app with add, complete, and delete functionality',
  [],
  []
);

// Implement the phase
const files = await generator.implementPhase(
  phase,
  new Map(),
  {
    onFileStart: (path) => console.log(`Generating: ${path}`),
    onFileChunk: (path, chunk) => process.stdout.write(chunk),
    onFileEnd: (path) => console.log(`\nCompleted: ${path}`),
  }
);
```

### Custom Provider Configuration

```typescript
import { CodeGenerator, createProvider, getProviderConfig } from './generator';

// Use OpenRouter with a specific model
const generator = CodeGenerator.withConfigs(
  {
    provider: 'openrouter',
    apiKey: process.env.OPENROUTER_API_KEY!,
    model: 'anthropic/claude-3.5-sonnet',
    baseUrl: 'https://openrouter.ai/api/v1',
  },
  {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4o',
  }
);
```

### Using Vercel AI SDK

```typescript
import { VercelAIProvider } from './generator/providers';

const provider = new VercelAIProvider({
  provider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY!,
  model: 'claude-3-5-sonnet-20241022',
});

// Stream a completion
const result = await provider.stream(
  [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Write a React component.' },
  ],
  (chunk) => process.stdout.write(chunk)
);
```

### Using Cloudflare AI

```typescript
import { CloudflareProvider } from './generator/providers';

const provider = new CloudflareProvider({
  provider: 'cloudflare',
  apiKey: process.env.CLOUDFLARE_API_TOKEN!,
  model: '@cf/meta/llama-3.1-70b-instruct',
  baseUrl: `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run`,
});
```

---

## Environment Variables

```bash
# .env

# OpenAI
OPENAI_API_KEY=sk-...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Google
GOOGLE_API_KEY=AIza...

# OpenRouter
OPENROUTER_API_KEY=sk-or-v1-...

# Cloudflare
CLOUDFLARE_API_TOKEN=...
CLOUDFLARE_ACCOUNT_ID=...
```

---

## Model Selection Guide

| Use Case | Recommended Model | Provider |
|----------|-------------------|----------|
| Code generation | Claude 3.5 Sonnet | Anthropic |
| Phase design | GPT-4o | OpenAI |
| Fast iteration | Claude 3 Haiku | Anthropic |
| Long context | Gemini 1.5 Pro | Google |
| Cost optimization | GPT-4o-mini | OpenAI |
| Edge deployment | Llama 3.1 70B | Cloudflare |
| Multi-model access | Any | OpenRouter |

---

## Error Handling

```typescript
// server/generator/utils.ts

interface RetryOptions {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const { maxRetries = 3, initialDelay = 1000, maxDelay = 10000 } = options;

  let lastError: Error;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on auth errors
      if (
        error instanceof Error &&
        (error.message.includes('401') || error.message.includes('403'))
      ) {
        throw error;
      }

      if (attempt < maxRetries) {
        console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
        delay = Math.min(delay * 2, maxDelay);
      }
    }
  }

  throw lastError!;
}
```
