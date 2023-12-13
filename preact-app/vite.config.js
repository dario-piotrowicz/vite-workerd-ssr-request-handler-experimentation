import preact from "@preact/preset-vite";
import { vitePluginViteNodeMiniflare } from "@hiogawa/vite-node-miniflare";
import { Log } from "miniflare";

console.log("vite.config.js");
/** @type {import('vite').UserConfig} */
export default {
	// config options
	clearScreen: false,
	appType: "custom",
	ssr: {
		noExternal: true,
	},
	plugins: [
		preact(),
		vitePluginViteNodeMiniflare({
			debug: true,
			entry: "/worker-entry.ts",
			miniflareOptions(options) {
				options.log = new Log();
			}
		}),
	],
	build: {
		minify: false,
		ssrEmitAssets: true,
	},
};
