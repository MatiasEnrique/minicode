import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { auth } from "@/lib/auth";
import { useSession } from "@/lib/auth-client";

const getSession = createServerFn({ method: "GET" }).handler(async () => {
	const request = getRequest();
	if (!request) {
		return null;
	}
	const session = await auth.api.getSession({
		headers: request.headers,
	});
	return session;
});

export const Route = createFileRoute("/_authed")({
	beforeLoad: async () => {
		const session = await getSession();
		if (!session?.user) {
			throw redirect({
				to: "/sign-up",
			});
		}
		return { session };
	},
	component: AuthedLayout,
});

function AuthedLayout() {
	const { data: session } = useSession();

	return (
		<div>
			<header className="border-b p-4">
				<div className="flex items-center justify-between">
					<span className="font-semibold">Dashboard</span>
					<span className="text-sm text-muted-foreground">
						{session?.user?.email}
					</span>
				</div>
			</header>
			<main>
				<Outlet />
			</main>
		</div>
	);
}
