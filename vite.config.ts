import { defineConfig } from "vite";
import {
  vitePlugin as remix,
  cloudflareDevProxyVitePlugin,
} from "@remix-run/dev";
import tsconfigPaths from "vite-tsconfig-paths";
import { getLoadContext } from "./load-context";

export default defineConfig({
  plugins: [
    cloudflareDevProxyVitePlugin({
      getLoadContext,
      configPath: "./wrangler.json",
    }),
    remix({
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
        v3_singleFetch: false,
        v3_lazyRouteDiscovery: false,
      },
    }),
    tsconfigPaths(),
  ],
  ssr: {
    resolve: {
      conditions: ["workerd", "worker", "browser"],
    },
  },
  resolve: {
    mainFields: ["browser", "module", "main"],
  },
  server: {
    host: "localhost",
    fs: {
      deny: [
        ".env",
        ".env.*",
        ".dev.vars",
        ".dev.vars.*",
        "*.{crt,pem}",
        "**/.git/**",
      ],
    },
  },
  build: {
    minify: true,
  },
});
