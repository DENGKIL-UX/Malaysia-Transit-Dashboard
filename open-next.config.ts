// default open-next.config.ts file created by @opennextjs/cloudflare
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";

export default defineCloudflareConfig({
        // R2 incremental cache persists cached responses across Worker isolate evictions.
        // Without this, in-memory caches are lost on every isolate recycle (~30s inactivity),
        // forcing expensive re-computation (JSON.parse, external API calls).
        // With R2: cached responses survive → ~0.5ms CPU instead of ~15-20ms cold start.
        // Requires CACHE_BUCKET binding in wrangler.jsonc.
        // Free tier: 10GB, 10M reads/mo, 1M writes/mo.
        incrementalCache: r2IncrementalCache
});
