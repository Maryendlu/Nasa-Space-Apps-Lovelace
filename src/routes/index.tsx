import { createFileRoute } from "@tanstack/react-router";
import { MarsAcademy } from "@/game/MarsAcademy";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mars Academy — Mars Mission | NASA Space Apps" },
      {
        name: "description",
        content:
          "Join Project New Horizon as Maya or Milo: ten days on Mars, scientific decisions, base exploration and interactive missions in English or Portuguese.",
      },
      { property: "og:title", content: "Mars Academy — Mars Mission" },
      {
        property: "og:description",
        content:
          "A ten-day educational Mars adventure with Maya, Milo and the Project New Horizon team.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return <MarsAcademy />;
}
