# SCOF Parser

SCOF (Shell Command Output Format) is a streaming-friendly format for LLM code generation. It uses familiar shell syntax that LLMs understand well.

## Format Specification

### File Creation

```bash
cat > path/to/file.ext << 'EOF'
// File contents here
// Can be multiple lines
EOF
```

### Key Rules

1. Use `cat > filename << 'EOF'` syntax
2. Single quotes around EOF marker
3. Each file ends with `EOF` on its own line
4. Files are generated sequentially

### Example Output

```bash
cat > src/App.tsx << 'EOF'
import React from 'react';

export function App() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Hello World</h1>
    </div>
  );
}
EOF

cat > src/main.tsx << 'EOF'
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
EOF
```

---

## Why SCOF?

| Advantage | Description |
|-----------|-------------|
| **LLM-friendly** | Shell syntax is in training data |
| **Streamable** | Can parse incrementally as tokens arrive |
| **Self-delimiting** | EOF markers clearly end files |
| **Error-resilient** | Can recover from LLM formatting mistakes |
| **Human-readable** | Easy to debug and understand |

---

## Type Definitions

```typescript
// server/parser/types.ts

export interface FileOutput {
  filePath: string;
  content: string;
}

export interface ParsingState {
  // Current parsing mode
  currentMode: 'idle' | 'file_creation';

  // Current file being parsed
  currentFile: string | null;

  // Accumulated content for current file
  contentBuffer: string;

  // EOF marker to look for
  eofMarker: string | null;

  // Are we inside an EOF block?
  insideEofBlock: boolean;

  // Partial line from previous chunk
  partialLineBuffer: string;

  // Tracking to prevent duplicates
  openedFiles: Set<string>;
  closedFiles: Set<string>;
}

export interface StreamingState {
  completedFiles: Map<string, FileOutput>;
  parsingState: ParsingState;
}

export interface ParseCallbacks {
  onFileStart: (filePath: string) => void;
  onFileChunk: (filePath: string, chunk: string) => void;
  onFileEnd: (filePath: string, content: string) => void;
}
```

---

## Parser Implementation

```typescript
// server/parser/scof.ts

import {
  FileOutput,
  ParsingState,
  StreamingState,
  ParseCallbacks
} from './types';

/**
 * Create initial streaming state
 */
export function createStreamingState(): StreamingState {
  return {
    completedFiles: new Map(),
    parsingState: {
      currentMode: 'idle',
      currentFile: null,
      contentBuffer: '',
      eofMarker: null,
      insideEofBlock: false,
      partialLineBuffer: '',
      openedFiles: new Set(),
      closedFiles: new Set(),
    },
  };
}

/**
 * Parse a streaming chunk and call callbacks as files are detected
 */
export function parseChunk(
  chunk: string,
  state: StreamingState,
  callbacks: ParseCallbacks
): StreamingState {
  const ps = state.parsingState;

  // Combine with partial line from previous chunk
  const fullContent = ps.partialLineBuffer + chunk;

  // Split into lines
  const lines = fullContent.split('\n');
  const lastLineComplete = chunk.endsWith('\n');

  // Process only complete lines
  const linesToProcess = lastLineComplete ? lines : lines.slice(0, -1);

  for (const line of linesToProcess) {
    processLine(line, state, callbacks);
  }

  // Store incomplete last line for next chunk
  if (!lastLineComplete && lines.length > 0) {
    ps.partialLineBuffer = lines[lines.length - 1];
  } else {
    ps.partialLineBuffer = '';
  }

  return state;
}

/**
 * Process a single line
 */
function processLine(
  line: string,
  state: StreamingState,
  callbacks: ParseCallbacks
): void {
  const ps = state.parsingState;
  const trimmedLine = line.trim();

  // Check for EOF marker (end of file)
  if (ps.insideEofBlock && ps.eofMarker && trimmedLine === ps.eofMarker) {
    finalizeFile(state, callbacks);
    return;
  }

  // Inside file content - accumulate
  if (ps.insideEofBlock && ps.currentFile) {
    // Preserve original formatting (including indentation)
    if (ps.contentBuffer.length > 0) {
      ps.contentBuffer += '\n';
    }
    ps.contentBuffer += line;

    // Send chunk callback for real-time display
    callbacks.onFileChunk(ps.currentFile, line + '\n');
    return;
  }

  // Skip empty lines and comments when not in a file
  if (trimmedLine === '' || trimmedLine.startsWith('#')) {
    return;
  }

  // Try to parse file creation command
  const command = parseCommand(trimmedLine);
  if (command) {
    startFile(command.filePath, command.eofMarker, state, callbacks);
  }
}

// ============ COMMAND PARSING ============

interface ParsedCommand {
  filePath: string;
  eofMarker: string;
}

/**
 * Parse a cat > file << 'EOF' command
 */
function parseCommand(line: string): ParsedCommand | null {
  // Normalize common LLM mistakes
  const normalized = normalizeLine(line);

  // Try different patterns
  const patterns = [
    // Quoted filename, quoted EOF: cat > "file.ts" << 'EOF'
    /cat\s*>\s*"([^"]+)"\s*<<\s*'([^']+)'/i,
    /cat\s*>\s*'([^']+)'\s*<<\s*'([^']+)'/i,

    // Unquoted filename, quoted EOF: cat > file.ts << 'EOF'
    /cat\s*>\s*([^\s<"']+)\s*<<\s*'([^']+)'/i,

    // Unquoted filename, unquoted EOF: cat > file.ts << EOF
    /cat\s*>\s*([^\s<"']+)\s*<<\s*([^\s'"]+)/i,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match) {
      return {
        filePath: match[1],
        eofMarker: match[2],
      };
    }
  }

  return null;
}

/**
 * Normalize common LLM mistakes
 */
function normalizeLine(line: string): string {
  return line
    // Fix case: CAT -> cat
    .replace(/\bCAT\b/gi, 'cat')
    .replace(/\bCat\b/g, 'cat')

    // Fix missing space: cat>file -> cat > file
    .replace(/cat>/gi, 'cat >')

    // Fix spacing around operators
    .replace(/>\s*([^<\s])/g, '> $1')
    .replace(/<<\s*([^|\s])/g, '<< $1')

    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

// ============ FILE LIFECYCLE ============

/**
 * Start parsing a new file
 */
function startFile(
  filePath: string,
  eofMarker: string,
  state: StreamingState,
  callbacks: ParseCallbacks
): void {
  const ps = state.parsingState;

  // Prevent duplicate opens
  if (ps.openedFiles.has(filePath)) {
    console.warn(`SCOF: File ${filePath} already opened, skipping`);
    return;
  }

  // Update parsing state
  ps.currentMode = 'file_creation';
  ps.currentFile = filePath;
  ps.eofMarker = eofMarker;
  ps.insideEofBlock = true;
  ps.contentBuffer = '';
  ps.openedFiles.add(filePath);

  // Notify callback
  callbacks.onFileStart(filePath);
}

/**
 * Finalize current file
 */
function finalizeFile(
  state: StreamingState,
  callbacks: ParseCallbacks
): void {
  const ps = state.parsingState;

  if (!ps.currentFile) return;

  const filePath = ps.currentFile;
  const content = ps.contentBuffer;

  // Store completed file
  state.completedFiles.set(filePath, {
    filePath,
    content,
  });

  // Prevent duplicate closes
  if (!ps.closedFiles.has(filePath)) {
    ps.closedFiles.add(filePath);
    callbacks.onFileEnd(filePath, content);
  }

  // Reset parsing state
  ps.currentMode = 'idle';
  ps.currentFile = null;
  ps.eofMarker = null;
  ps.insideEofBlock = false;
  ps.contentBuffer = '';
}

// ============ FORMAT INSTRUCTIONS ============

/**
 * Get format instructions for the LLM prompt
 */
export function getFormatInstructions(): string {
  return `
Use this EXACT format for generating files:

cat > path/to/file.ext << 'EOF'
// Your file content here
// Can be multiple lines
// Preserve proper indentation
EOF

RULES:
1. Use single quotes around EOF marker: << 'EOF'
2. Each file MUST end with EOF on its own line
3. Generate files one after another
4. No other commands - only cat > file << 'EOF'
5. Preserve proper indentation in file content

EXAMPLE:

cat > src/components/Button.tsx << 'EOF'
import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
}

export function Button({ children, onClick, variant = 'primary' }: ButtonProps) {
  const baseClasses = 'px-4 py-2 rounded-lg font-medium transition-colors';
  const variantClasses = variant === 'primary'
    ? 'bg-blue-600 text-white hover:bg-blue-700'
    : 'bg-gray-200 text-gray-900 hover:bg-gray-300';

  return (
    <button
      onClick={onClick}
      className={\`\${baseClasses} \${variantClasses}\`}
    >
      {children}
    </button>
  );
}
EOF

cat > src/App.tsx << 'EOF'
import React from 'react';
import { Button } from './components/Button';

export function App() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Hello World</h1>
      <Button onClick={() => alert('Clicked!')}>
        Click Me
      </Button>
    </div>
  );
}
EOF
`.trim();
}
```

---

## Chunk Boundary Handling

The parser handles arbitrary chunk boundaries correctly:

```
Chunk 1: "cat > src/App.tsx << 'EOF'\nimport Re"
Chunk 2: "act from 'react';\n\nexport function App"
Chunk 3: "() {\n  return <div>Hello</div>;\n}\nEOF\n"
```

**How it works:**

1. `partialLineBuffer` stores incomplete lines
2. On each chunk, combine with previous partial
3. Only process complete lines (ending with `\n`)
4. Store new partial for next chunk

```typescript
// Example: chunk ends mid-line
const chunk1 = "import Re";  // No newline
const chunk2 = "act from 'react';\n";

// After chunk1: partialLineBuffer = "import Re"
// After chunk2: processes "import React from 'react';"
```

---

## Error Resilience

The parser handles common LLM mistakes:

| Mistake | Example | Correction |
|---------|---------|------------|
| Wrong case | `CAT > file` | `cat > file` |
| Missing space | `cat>file` | `cat > file` |
| Double quotes on EOF | `<< "EOF"` | Accepted |
| No quotes on EOF | `<< EOF` | Accepted |
| Extra whitespace | `cat  >  file` | Normalized |

---

## Usage Example

```typescript
import { createStreamingState, parseChunk, getFormatInstructions } from './parser';

// Create state
const state = createStreamingState();

// Parse streaming response
for await (const chunk of llmStream) {
  parseChunk(chunk, state, {
    onFileStart: (path) => {
      console.log(`Started: ${path}`);
      ws.send(JSON.stringify({ type: 'file_start', path }));
    },
    onFileChunk: (path, content) => {
      ws.send(JSON.stringify({ type: 'file_chunk', path, chunk: content }));
    },
    onFileEnd: (path, content) => {
      console.log(`Completed: ${path} (${content.length} bytes)`);
      ws.send(JSON.stringify({ type: 'file_end', path, content }));
    },
  });
}

// Get all completed files
const files = Array.from(state.completedFiles.values());
console.log(`Generated ${files.length} files`);
```
