// default open-next.config.ts file created by @opennextjs/cloudflare
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
// import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";

export default defineCloudflareConfig({
        // R2 incremental cache requires a CACHE_BUCKET binding in wrangler.jsonc.
        // TODO: Create R2 bucket, add binding, then uncomment below.
        // See https://opennext.js.org/cloudflare/caching for setup instructions.
        // incrementalCache: r2IncrementalCache
});
