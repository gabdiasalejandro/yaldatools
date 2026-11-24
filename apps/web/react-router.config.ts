import type { Config } from "@react-router/dev/config";

// Static site: every page and language is pre-rendered to its own HTML file
// so search engines index each tool and language separately.
export default {
  ssr: false,
  prerender: true,
} satisfies Config;
