// default open-next.config.ts file created by @opennextjs/cloudflare
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
// import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";

export default defineCloudflareConfig({
        // R2 incremental cache requires:
        //   1. An R2 bucket: npx wrangler r2 bucket create malaysia-transit-cache
        //   2. Binding in wrangler.jsonc with name "NEXT_INC_CACHE_R2_BUCKET"
        //   3. Uncomment the import and line below
        // See https://opennext.js.org/cloudflare/caching for setup instructions.
        // incrementalCache: r2IncrementalCache
});
