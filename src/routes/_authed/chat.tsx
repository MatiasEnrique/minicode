import Editor from "@monaco-editor/react";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
	FileExplorer,
	type SelectedFile,
} from "@/components/chat/file-explorer";
import { ProjectSelector } from "@/components/chat/project-selector";

export const Route = createFileRoute("/_authed/chat")({
	component: Chat,
});

function Chat() {
	const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);

	return (
		<div className="flex h-[calc(100vh-57px)]">
			{/* Sidebar */}
			<aside className="w-64 border-r bg-sidebar text-sidebar-foreground flex flex-col">
				{/* Project Selector */}
				<div className="p-2 border-b">
					<ProjectSelector />
				</div>

				{/* File Explorer */}
				<div className="flex-1 overflow-hidden">
					<FileExplorer
						onFileSelect={setSelectedFile}
						selectedFile={selectedFile?.path}
					/>
				</div>
			</aside>

			{/* Main Editor Area */}
			<main className="flex-1 flex flex-col bg-background">
				{selectedFile ? (
					<>
						{/* File tab header */}
						<div className="h-9 border-b flex items-center px-3 bg-muted/30">
							<span className="text-xs text-muted-foreground">
								{selectedFile.path}
							</span>
						</div>
						{/* Monaco Editor */}
						<div className="flex-1">
							<Editor
								height="100%"
								language={selectedFile.language}
								value={selectedFile.content}
								theme="vs-dark"
								options={{
									readOnly: true,
									minimap: { enabled: true },
									fontSize: 13,
									lineNumbers: "on",
									scrollBeyondLastLine: false,
									automaticLayout: true,
									padding: { top: 12 },
								}}
							/>
						</div>
					</>
				) : (
					<div className="flex-1 flex items-center justify-center text-muted-foreground">
						<div className="text-center space-y-2">
							<p className="text-lg">Select a file to view</p>
							<p className="text-sm">
								Choose a file from the explorer on the left
							</p>
						</div>
					</div>
				)}
			</main>
		</div>
	);
}
