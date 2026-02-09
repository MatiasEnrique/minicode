import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { signIn } from "@/lib/auth-client";

export const Route = createFileRoute("/sign-in")({
	component: SignIn,
});

interface FormState {
	error: string | null;
	fieldErrors: {
		email?: string;
		password?: string;
	};
	pending: boolean;
}

const initialState: FormState = {
	error: null,
	fieldErrors: {},
	pending: false,
};

export function SignIn({ ...props }: React.ComponentProps<typeof Card>) {
	const navigate = useNavigate();

	const [state, formAction, isPending] = useActionState(
		async (_prevState: FormState, formData: FormData): Promise<FormState> => {
			const email = formData.get("email") as string;
			const password = formData.get("password") as string;

			const fieldErrors: FormState["fieldErrors"] = {};

			if (!email || !email.includes("@")) {
				fieldErrors.email = "Please enter a valid email address.";
			}

			if (!password) {
				fieldErrors.password = "Password is required.";
			}

			if (Object.keys(fieldErrors).length > 0) {
				return { error: null, fieldErrors, pending: false };
			}

			const { error } = await signIn.email({
				email: email.trim(),
				password,
			});

			if (error) {
				return {
					error: error.message || "Invalid email or password.",
					fieldErrors: {},
					pending: false,
				};
			}

			navigate({ to: "/chat" });
			return { error: null, fieldErrors: {}, pending: false };
		},
		initialState,
	);

	return (
		<div className="flex min-h-screen items-center justify-center p-4">
			<Card className="w-full max-w-md" {...props}>
				<CardHeader>
					<CardTitle>Sign in</CardTitle>
					<CardDescription>
						Enter your email and password to sign in to your account
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form action={formAction}>
						<FieldGroup>
							{state.error && (
								<div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
									{state.error}
								</div>
							)}
							<Field>
								<FieldLabel htmlFor="email">Email</FieldLabel>
								<Input
									id="email"
									name="email"
									type="email"
									placeholder="m@example.com"
									required
									disabled={isPending}
								/>
								{state.fieldErrors.email && (
									<FieldError>{state.fieldErrors.email}</FieldError>
								)}
							</Field>
							<Field>
								<FieldLabel htmlFor="password">Password</FieldLabel>
								<Input
									id="password"
									name="password"
									type="password"
									required
									disabled={isPending}
								/>
								{state.fieldErrors.password && (
									<FieldError>{state.fieldErrors.password}</FieldError>
								)}
							</Field>
							<FieldGroup>
								<Field>
									<Button type="submit" disabled={isPending}>
										{isPending ? "Signing in..." : "Sign in"}
									</Button>
									<FieldDescription className="px-6 text-center">
										Don&apos;t have an account?
									</FieldDescription>
								</Field>
							</FieldGroup>
						</FieldGroup>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
