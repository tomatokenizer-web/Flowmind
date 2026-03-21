import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: "flowmind",
  // All task files must live under src/trigger/
  dirs: ["./src/trigger"],
  maxDuration: 300, // 5 minutes per task
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
});
