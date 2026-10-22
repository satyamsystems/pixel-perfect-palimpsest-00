import { createFileRoute } from "@tanstack/react-router";
import { Chat } from "@/components/app/Chat";
import { PageHeader } from "@/components/app/ui-bits";

export const Route = createFileRoute("/_shell/assistant")({
  head: () => ({
    meta: [
      { title: "Trajectify AI Assistant — Trajectify.AI" },
      {
        name: "description",
        content:
          "Personalized advice and trajectory simulations grounded in your active goal and progress.",
      },
      { property: "og:title", content: "Trajectify AI Assistant — Trajectify.AI" },
      {
        property: "og:description",
        content: "Answers grounded in your goal, roadmap and progress.",
      },
    ],
  }),
  component: AssistantPage,
});

function AssistantPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Trajectify AI Assistant"
        subtitle="Advice and scenario simulations grounded in your real profile, roadmap, and hours."
      />
      <div className="card-surface h-[calc(100vh-14rem)] min-h-[500px] overflow-hidden rounded-2xl border shadow-soft">
        <Chat />
      </div>
    </div>
  );
}
