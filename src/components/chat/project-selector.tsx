import { FolderSimple } from "@phosphor-icons/react";
import { useState } from "react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

const projects = [
	{ id: "1", name: "minicode-client" },
	{ id: "2", name: "minicode-server" },
	{ id: "3", name: "my-app" },
];

export function ProjectSelector() {
	const [selectedProject, setSelectedProject] = useState(projects[0].id);

	const handleValueChange = (value: string | null) => {
		if (value) {
			setSelectedProject(value);
		}
	};

	return (
		<Select value={selectedProject} onValueChange={handleValueChange}>
			<SelectTrigger className="w-full">
				<SelectValue>
					<FolderSimple className="size-4" />
					<span>{projects.find((p) => p.id === selectedProject)?.name}</span>
				</SelectValue>
			</SelectTrigger>
			<SelectContent>
				{projects.map((project) => (
					<SelectItem key={project.id} value={project.id}>
						<FolderSimple className="size-4" />
						{project.name}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
