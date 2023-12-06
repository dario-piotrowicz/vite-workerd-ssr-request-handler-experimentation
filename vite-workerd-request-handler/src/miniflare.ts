import { Log, Miniflare } from "miniflare";
import type { ViteDevServer } from "vite";
//@ts-ignore
import workerdBootloader from "./workerdBootloader.js.txt";

export function instantiateMiniflare({
	entrypoint,
	server,
	requestHandler,
}: {
	entrypoint: string;
	server: ViteDevServer;
	requestHandler: (opts: {
		entrypointModule: any;
		request: Request;
		context: { waitUntil: (p: Promise<unknown>) => void }
	}) => Response | Promise<Response>;
}): Miniflare {
	const viteHttpServerAddress = server.httpServer.address();
	const viteServerAddress =
		typeof viteHttpServerAddress === "string"
			? viteHttpServerAddress
			: `http://${
					/:/.test(viteHttpServerAddress.address)
						? "localhost"
						: viteHttpServerAddress.address
			  }:${viteHttpServerAddress.port}`;

	const script = workerdBootloader
		.replace(/VITE_SERVER_ADDRESS/, viteServerAddress)
		.replace(/WORKERD_APP_ENTRYPOINT/, entrypoint)
		.replace(/__REQUEST_HANDLER__/, () => {
			const functionStr = requestHandler.toString();

			if (
				functionStr.startsWith("async function requestHandler(") ||
				functionStr.startsWith("function requestHandler(")
			) {
				return functionStr;
			}

			if (functionStr.startsWith("requestHandler(")) {
				return `function ${functionStr};`;
			}

			return `const requestHandler = ${functionStr};`;
		});

	// create miniflare instance
	// load it with module loader code and import to the entry point

	return new Miniflare({
		log: new Log(),
		modules: true,
		script,
		unsafeEvalBinding: "UNSAFE_EVAL",
		inspectorPort: 9225,
	});
}
