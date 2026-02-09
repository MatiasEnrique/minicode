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
import { signUp } from "@/lib/auth-client";

export const Route = createFileRoute("/sign-up")({
	component: SignUp,
});

interface FormState {
	error: string | null;
	fieldErrors: {
		name?: string;
		email?: string;
		password?: string;
		confirmPassword?: string;
	};
	pending: boolean;
}

const initialState: FormState = {
	error: null,
	fieldErrors: {},
	pending: false,
};

export function SignUp({ ...props }: React.ComponentProps<typeof Card>) {
	const navigate = useNavigate();

	const [state, formAction, isPending] = useActionState(
		async (_prevState: FormState, formData: FormData): Promise<FormState> => {
			const name = formData.get("name") as string;
			const email = formData.get("email") as string;
			const password = formData.get("password") as string;
			const confirmPassword = formData.get("confirmPassword") as string;

			const fieldErrors: FormState["fieldErrors"] = {};

			if (!name || name.trim().length < 2) {
				fieldErrors.name = "Name must be at least 2 characters long.";
			}

			if (!email || !email.includes("@")) {
				fieldErrors.email = "Please enter a valid email address.";
			}

			if (!password || password.length < 8) {
				fieldErrors.password = "Password must be at least 8 characters long.";
			}

			if (password !== confirmPassword) {
				fieldErrors.confirmPassword = "Passwords do not match.";
			}

			if (Object.keys(fieldErrors).length > 0) {
				return { error: null, fieldErrors, pending: false };
			}

			const { error } = await signUp.email({
				name: name.trim(),
				email: email.trim(),
				password,
			});

			if (error) {
				return {
					error: error.message || "An error occurred during sign up.",
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
					<CardTitle>Create an account</CardTitle>
					<CardDescription>
						Enter your information below to create your account
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
								<FieldLabel htmlFor="name">Full Name</FieldLabel>
								<Input
									id="name"
									name="name"
									type="text"
									placeholder="John Doe"
									required
									disabled={isPending}
								/>
								{state.fieldErrors.name && (
									<FieldError>{state.fieldErrors.name}</FieldError>
								)}
							</Field>
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
								<FieldDescription>
									We&apos;ll use this to contact you. We will not share your
									email with anyone else.
								</FieldDescription>
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
								<FieldDescription>
									Must be at least 8 characters long.
								</FieldDescription>
								{state.fieldErrors.password && (
									<FieldError>{state.fieldErrors.password}</FieldError>
								)}
							</Field>
							<Field>
								<FieldLabel htmlFor="confirmPassword">
									Confirm Password
								</FieldLabel>
								<Input
									id="confirmPassword"
									name="confirmPassword"
									type="password"
									required
									disabled={isPending}
								/>
								<FieldDescription>
									Please confirm your password.
								</FieldDescription>
								{state.fieldErrors.confirmPassword && (
									<FieldError>{state.fieldErrors.confirmPassword}</FieldError>
								)}
							</Field>
							<FieldGroup>
								<Field>
									<Button type="submit" disabled={isPending}>
										{isPending ? "Creating Account..." : "Create Account"}
									</Button>
									<FieldDescription className="px-6 text-center">
										Already have an account?
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
