import {
	CaretRight,
	File,
	FileCode,
	FileCss,
	FileTs,
	FileTsx,
	Folder,
	FolderOpen,
} from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface FileNode {
	name: string;
	type: "file" | "folder";
	children?: FileNode[];
	content?: string;
}

export const fileTree: FileNode[] = [
	{
		name: "src",
		type: "folder",
		children: [
			{
				name: "routes",
				type: "folder",
				children: [
					{
						name: "index.tsx",
						type: "file",
						content: `import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <div className="p-4">
      <h1>Welcome to Minicode</h1>
    </div>
  );
}`,
					},
					{
						name: "chat.tsx",
						type: "file",
						content: `import { createFileRoute } from "@tanstack/react-router";
import { ProjectSelector } from "@/components/chat/project-selector";
import { FileExplorer } from "@/components/chat/file-explorer";

export const Route = createFileRoute("/_authed/chat")({
  component: Chat,
});

function Chat() {
  return (
    <div className="flex h-[calc(100vh-57px)]">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-sidebar">
        <ProjectSelector />
        <FileExplorer />
      </aside>
      {/* Main Chat Area */}
      <main className="flex-1">
        {/* Monaco Editor goes here */}
      </main>
    </div>
  );
}`,
					},
					{
						name: "_authed.tsx",
						type: "file",
						content: `import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed")({
  beforeLoad: async () => {
    // Auth check logic
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  return (
    <div>
      <header className="border-b p-4">
        <span className="font-semibold">Dashboard</span>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}`,
					},
				],
			},
			{
				name: "components",
				type: "folder",
				children: [
					{
						name: "ui",
						type: "folder",
						children: [
							{
								name: "button.tsx",
								type: "file",
								content: `import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        outline: "border border-input bg-background hover:bg-accent",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export function Button({ className, variant, size, ...props }) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}`,
							},
							{
								name: "select.tsx",
								type: "file",
								content: `import * as SelectPrimitive from "@radix-ui/react-select";
import { cn } from "@/lib/utils";

export const Select = SelectPrimitive.Root;
export const SelectTrigger = SelectPrimitive.Trigger;
export const SelectValue = SelectPrimitive.Value;
export const SelectContent = SelectPrimitive.Content;
export const SelectItem = SelectPrimitive.Item;`,
							},
							{
								name: "card.tsx",
								type: "file",
								content: `import { cn } from "@/lib/utils";

export function Card({ className, ...props }) {
  return (
    <div
      className={cn("rounded-lg border bg-card text-card-foreground shadow-sm", className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }) {
  return <div className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />;
}

export function CardTitle({ className, ...props }) {
  return <h3 className={cn("text-2xl font-semibold leading-none", className)} {...props} />;
}

export function CardContent({ className, ...props }) {
  return <div className={cn("p-6 pt-0", className)} {...props} />;
}`,
							},
						],
					},
					{
						name: "chat",
						type: "folder",
						children: [
							{
								name: "project-selector.tsx",
								type: "file",
								content: `import { useState } from "react";
import { FolderSimple } from "@phosphor-icons/react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const projects = [
  { id: "1", name: "minicode-client" },
  { id: "2", name: "minicode-server" },
  { id: "3", name: "my-app" },
];

export function ProjectSelector() {
  const [selectedProject, setSelectedProject] = useState(projects[0].id);

  return (
    <Select value={selectedProject} onValueChange={setSelectedProject}>
      <SelectTrigger className="w-full">
        <FolderSimple className="size-4" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {projects.map((project) => (
          <SelectItem key={project.id} value={project.id}>
            {project.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}`,
							},
							{
								name: "file-explorer.tsx",
								type: "file",
								content: `import { useState } from "react";
import { CaretRight, Folder, FolderOpen, File } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// Recursive file tree component
export function FileExplorer({ onFileSelect }) {
  const [selectedFile, setSelectedFile] = useState(null);

  return (
    <div className="flex flex-col overflow-auto">
      <div className="px-2 py-1.5 text-xs font-medium uppercase">
        Explorer
      </div>
      {/* File tree nodes */}
    </div>
  );
}`,
							},
						],
					},
				],
			},
			{
				name: "lib",
				type: "folder",
				children: [
					{
						name: "utils.ts",
						type: "file",
						content: `import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}`,
					},
					{
						name: "auth.ts",
						type: "file",
						content: `import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
  },
});`,
					},
				],
			},
			{
				name: "index.css",
				type: "file",
				content: `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
  }
}`,
			},
		],
	},
	{
		name: "package.json",
		type: "file",
		content: `{
  "name": "minicode-client",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@tanstack/react-router": "^1.0.0",
    "@monaco-editor/react": "^4.6.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "vite": "^5.0.0"
  }
}`,
	},
	{
		name: "tsconfig.json",
		type: "file",
		content: `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}`,
	},
	{
		name: "vite.config.ts",
		type: "file",
		content: `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});`,
	},
];

function getFileIcon(filename: string) {
	if (filename.endsWith(".tsx")) {
		return <FileTsx className="size-4 text-blue-500" />;
	}
	if (filename.endsWith(".ts")) {
		return <FileTs className="size-4 text-blue-400" />;
	}
	if (filename.endsWith(".css")) {
		return <FileCss className="size-4 text-purple-500" />;
	}
	if (filename.endsWith(".json")) {
		return <FileCode className="size-4 text-yellow-500" />;
	}
	return <File className="size-4 text-muted-foreground" />;
}

function getLanguageFromFilename(filename: string): string {
	if (filename.endsWith(".tsx")) return "typescript";
	if (filename.endsWith(".ts")) return "typescript";
	if (filename.endsWith(".jsx")) return "javascript";
	if (filename.endsWith(".js")) return "javascript";
	if (filename.endsWith(".css")) return "css";
	if (filename.endsWith(".json")) return "json";
	if (filename.endsWith(".md")) return "markdown";
	return "plaintext";
}

export interface SelectedFile {
	path: string;
	content: string;
	language: string;
}

interface FileTreeNodeProps {
	node: FileNode;
	depth: number;
	path: string;
	selectedFile: string | null;
	onSelectFile: (file: SelectedFile) => void;
}

function FileTreeNode({
	node,
	depth,
	path,
	selectedFile,
	onSelectFile,
}: FileTreeNodeProps) {
	const [isExpanded, setIsExpanded] = useState(depth < 2);
	const fullPath = path ? `${path}/${node.name}` : node.name;

	if (node.type === "folder") {
		return (
			<div>
				<Button
					variant="ghost"
					size="sm"
					className={cn(
						"w-full justify-start gap-1 h-7 px-1",
						"hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
					)}
					style={{ paddingLeft: `${depth * 12 + 4}px` }}
					onClick={() => setIsExpanded(!isExpanded)}
				>
					<CaretRight
						className={cn(
							"size-3 transition-transform",
							isExpanded && "rotate-90",
						)}
					/>
					{isExpanded ? (
						<FolderOpen className="size-4 text-sidebar-foreground/70" />
					) : (
						<Folder className="size-4 text-sidebar-foreground/70" />
					)}
					<span className="truncate">{node.name}</span>
				</Button>
				{isExpanded && node.children && (
					<div>
						{node.children.map((child) => (
							<FileTreeNode
								key={child.name}
								node={child}
								depth={depth + 1}
								path={fullPath}
								selectedFile={selectedFile}
								onSelectFile={onSelectFile}
							/>
						))}
					</div>
				)}
			</div>
		);
	}

	const isSelected = selectedFile === fullPath;

	return (
		<Button
			variant="ghost"
			size="sm"
			className={cn(
				"w-full justify-start gap-1.5 h-7 px-1",
				"hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
				isSelected && "bg-sidebar-accent text-sidebar-accent-foreground",
			)}
			style={{ paddingLeft: `${depth * 12 + 16}px` }}
			onClick={() =>
				onSelectFile({
					path: fullPath,
					content: node.content || "",
					language: getLanguageFromFilename(node.name),
				})
			}
		>
			{getFileIcon(node.name)}
			<span className="truncate">{node.name}</span>
		</Button>
	);
}

interface FileExplorerProps {
	onFileSelect?: (file: SelectedFile) => void;
	selectedFile?: string | null;
}

export function FileExplorer({
	onFileSelect,
	selectedFile,
}: FileExplorerProps) {
	const handleFileSelect = (file: SelectedFile) => {
		onFileSelect?.(file);
	};

	return (
		<div className="flex flex-col overflow-auto">
			<div className="px-2 py-1.5 text-xs font-medium text-sidebar-foreground/70 uppercase tracking-wide">
				Explorer
			</div>
			<div className="flex-1 overflow-auto">
				{fileTree.map((node) => (
					<FileTreeNode
						key={node.name}
						node={node}
						depth={0}
						path=""
						selectedFile={selectedFile ?? null}
						onSelectFile={handleFileSelect}
					/>
				))}
			</div>
		</div>
	);
}
