// default open-next.config.ts file created by @opennextjs/cloudflare
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";

export default defineCloudflareConfig({
        // R2 incremental cache persists cached responses across Worker isolate evictions.
        // Without this, in-memory caches are lost on every isolate recycle, forcing
        // expensive re-computation (e.g. JSON.parse of 241KB headline data).
        // R2 cache ensures warm hits survive → ~0.2ms CPU instead of ~3-5ms.
        incrementalCache: r2IncrementalCache
});
