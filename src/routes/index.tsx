import { createFileRoute } from "@tanstack/react-router";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
	component: LandingPage,
});

function LandingPage() {
	return (
		<div className="flex min-h-screen flex-col bg-background text-foreground">
			<main className="flex flex-1 flex-col items-center justify-center px-4">
				<div className="max-w-lg text-center">
					<div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
						<span className="size-1.5 rounded-full bg-green-500" />
						Open Source
					</div>
					<h1 className="text-4xl font-bold tracking-tight">Minicode</h1>
					<p className="mt-4 text-muted-foreground">
						An open-source reference implementation for building AI code
						generators like Lovable. Inspired by{" "}
						<a
							href="https://github.com/cloudflare/vibesdk"
							target="_blank"
							rel="noopener noreferrer"
							className="text-primary hover:underline"
						>
							vibesdk
						</a>
						.
					</p>
					<div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
						<a
							href="https://github.com/matiasngf/minicode"
							target="_blank"
							rel="noopener noreferrer"
							className={cn(buttonVariants({ size: "lg" }))}
						>
							<GitHubIcon className="size-4" />
							GitHub
						</a>
						<a
							href="https://github.com/matiasngf/minicode#readme"
							target="_blank"
							rel="noopener noreferrer"
							className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
						>
							Documentation
						</a>
					</div>
				</div>
			</main>
			<footer className="py-6 text-center text-xs text-muted-foreground">
				Built for learning
			</footer>
		</div>
	);
}

function GitHubIcon({ className }: { className?: string }) {
	return (
		<svg
			aria-hidden="true"
			className={cn(className)}
			fill="currentColor"
			viewBox="0 0 24 24"
		>
			<path
				fillRule="evenodd"
				clipRule="evenodd"
				d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
			/>
		</svg>
	);
}
