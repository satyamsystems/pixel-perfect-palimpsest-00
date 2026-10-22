import { createFileRoute, redirect } from "@tanstack/react-router";
import { authService } from "@/services/authService";
import { AuthLayout } from "@/components/app/AuthLayout";
import { AuthForm } from "@/components/app/AuthForm";

export const Route = createFileRoute("/login")({
  beforeLoad: () => {
    const user = authService.getCurrentUser();
    if (user) {
      throw redirect({ to: "/dashboard" });
    }
  },
  head: () => ({
    meta: [
      { title: "Log in — Trajectify.AI" },
      {
        name: "description",
        content: "Log in to Trajectify.AI to simulate your future and track your living roadmap.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  return (
    <AuthLayout>
      <AuthForm mode="login" />
    </AuthLayout>
  );
}
