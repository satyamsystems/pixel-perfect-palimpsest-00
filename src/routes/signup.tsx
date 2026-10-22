import { createFileRoute, redirect } from "@tanstack/react-router";
import { authService } from "@/services/authService";
import { AuthLayout } from "@/components/app/AuthLayout";
import { AuthForm } from "@/components/app/AuthForm";

export const Route = createFileRoute("/signup")({
  beforeLoad: () => {
    const user = authService.getCurrentUser();
    if (user) {
      throw redirect({ to: "/dashboard" });
    }
  },
  head: () => ({
    meta: [
      { title: "Sign up — Trajectify.AI" },
      {
        name: "description",
        content: "Create an account on Trajectify.AI to build your custom career roadmap.",
      },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  return (
    <AuthLayout>
      <AuthForm mode="signup" />
    </AuthLayout>
  );
}
