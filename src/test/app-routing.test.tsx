import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

describe("Trajectify.AI App Routing", () => {
  const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

  it("matches a valid page for /", () => {
    const matches = router.matchRoutes("/");
    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
    expect(matches.at(-1)?.routeId).toBe("/");
  });

  it("matches authentication routes (/login and /signup)", () => {
    const loginMatches = router.matchRoutes("/login");
    expect(loginMatches.at(-1)?.routeId).toBe("/login");

    const signupMatches = router.matchRoutes("/signup");
    expect(signupMatches.at(-1)?.routeId).toBe("/signup");
  });

  it("matches shell application routes", () => {
    const dashboardMatches = router.matchRoutes("/dashboard");
    expect(dashboardMatches.at(-1)?.routeId).toBe("/_shell/dashboard");

    const checkinMatches = router.matchRoutes("/checkin");
    expect(checkinMatches.at(-1)?.routeId).toBe("/_shell/checkin");

    const roadmapMatches = router.matchRoutes("/roadmap");
    expect(roadmapMatches.at(-1)?.routeId).toBe("/_shell/roadmap");

    const compareMatches = router.matchRoutes("/compare");
    expect(compareMatches.at(-1)?.routeId).toBe("/_shell/compare");

    const onboardingMatches = router.matchRoutes("/onboarding");
    expect(onboardingMatches.at(-1)?.routeId).toBe("/_shell/onboarding");
  });
});
