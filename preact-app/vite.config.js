import preact from "@preact/preset-vite";

import { preactWorkerdSSR } from "preact-workerd-ssr-plugin";

import { vitePluginViteNodeMiniflare } from "@hiogawa/vite-node-miniflare";
import { Log } from "miniflare";

const selectedWorkerdPluginName = [
  "vitePluginViteNodeMiniflare",
  "preactWorkerdSSR",
].find((pluginName) => process.env.pluginName === pluginName);

const workerdPluginName = selectedWorkerdPluginName ?? "preactWorkerdSSR";

console.log(`\nRunning Vite using the ${workerdPluginName} Vite plugin...\n`);

const workerdPlugins = {
  // This is the preactWorkerdSSR plugin defined in this monorepo
  preactWorkerdSSR: preactWorkerdSSR(),
  // This is an external plugin that uses vite-node under the hood
  // see:
  // - https://github.com/dario-piotrowicz/vite-workerd-ssr-request-handler-experimentation/pull/1
  // - https://github.com/hi-ogawa/vite-plugins/tree/main/packages/vite-node-miniflare
  vitePluginViteNodeMiniflare: vitePluginViteNodeMiniflare({
    debug: true,
    entry: "/worker-entry.ts",
    miniflareOptions(options) {
      options.log = new Log();
    },
  }),
};

const workerdPlugin = workerdPlugins[workerdPluginName];

/** @type {import('vite').UserConfig} */
export default {
	// config options
	clearScreen: false,
	appType: "custom",
	ssr: {
		target: "webworker",
		noExternal: true,
		optimizeDeps: {
			include: ["preact", "preact-render-to-string"],
		},
	},
	plugins: [
		preact(),
		workerdPlugin,
	],
	build: {
		minify: false,
		ssrEmitAssets: true,
	},
};
