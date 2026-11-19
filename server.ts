import { createRequestHandler, type ServerBuild } from "@remix-run/cloudflare";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore This file won’t exist if it hasn’t yet been built
import * as build from "./build/server";
import { getLoadContext } from "./load-context";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handleRemixRequest = createRequestHandler(build as any as ServerBuild);

export default {
  async fetch(request, env, ctx) {
    // The Vite build ships the full route manifest.
    if (new URL(request.url).pathname === "/__manifest") {
      return new Response("Not Found", { status: 404 });
    }

    let response: Response;
    try {
      const loadContext = getLoadContext({
        request,
        context: {
          cloudflare: {
            // This object matches the return value from Wrangler's
            // `getPlatformProxy` used during development via Remix's
            // `cloudflareDevProxyVitePlugin`:
            // https://developers.cloudflare.com/workers/wrangler/api/#getplatformproxy
            cf: request.cf,
            ctx: {
              waitUntil: ctx.waitUntil.bind(ctx),
              passThroughOnException: ctx.passThroughOnException.bind(ctx),
            },
            caches,
            env,
          },
        },
      });
      response = await handleRemixRequest(request, loadContext);
    } catch {
      console.error("Worker request failed");
      response = new Response("An unexpected error occurred", { status: 500 });
    }

    const headers = new Headers(response.headers);
    headers.set("Cache-Control", "private, no-store");
    headers.set("Referrer-Policy", "strict-origin");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("X-Frame-Options", "DENY");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
} satisfies ExportedHandler<Env>;
