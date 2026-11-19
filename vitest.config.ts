import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";
import wranglerConfig from "./wrangler.json";

export default defineWorkersConfig({
  test: {
    include: ["test/**/*.test.ts"],
    poolOptions: {
      workers: {
        singleWorker: true,
        miniflare: {
          compatibilityFlags: wranglerConfig.compatibility_flags,
          compatibilityDate: wranglerConfig.compatibility_date,
          kvNamespaces: ["TO_DO_LIST"],
        },
      },
    },
  },
});
