import { createFileRoute } from "@tanstack/react-router";
import { Chat } from "@/components/app/Chat";
import { PageHeader } from "@/components/app/ui-bits";

export const Route = createFileRoute("/_shell/assistant")({
  head: () => ({
    meta: [
      { title: "Ask Assistant — Trajectify.AI" },
      { name: "description", content: "Ask questions about your plan and get answers based on your profile." },
      { property: "og:title", content: "Ask Assistant — Trajectify.AI" },
      { property: "og:description", content: "Your AI guide for career and skill planning." },
    ],
  }),
  component: () => (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Ask Assistant" subtitle="Answers grounded in your goal, roadmap and progress." />
      <div className="card-surface h-[calc(100vh-15rem)] overflow-hidden">
        <Chat />
      </div>
    </div>
  ),
});
