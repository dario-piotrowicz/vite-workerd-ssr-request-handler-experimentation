import preact from "@preact/preset-vite";
import { preactWorkerdSSR } from "preact-workerd-ssr-plugin";

console.log("vite.config.js");
/** @type {import('vite').UserConfig} */
export default {
	// config options
	ssr: {
		target: "webworker",
		noExternal: true,
		optimizeDeps: {
			include: ["preact", "preact-render-to-string"],
		},
	},
	plugins: [preact(), preactWorkerdSSR()],
	build: {
		minify: false,
		ssrEmitAssets: true,
	},
};
