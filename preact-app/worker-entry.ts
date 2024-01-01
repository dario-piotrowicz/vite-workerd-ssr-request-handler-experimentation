import { render } from "./entry-server";
import type { ViteNodeMiniflareClient } from "@hiogawa/vite-node-miniflare/dist/client/vite-node"

export default {
  async fetch(request: Request, env: any) {
    const ssrHtml = render(request.url);
    let fullHtml = wrapHtml(ssrHtml);
    if (env.__VITE_NODE_MINIFLARE_CLIENT) {
      const client: ViteNodeMiniflareClient = env.__VITE_NODE_MINIFLARE_CLIENT;
      fullHtml = await client.rpc.transformIndexHtml("/", fullHtml);
    }
    return new Response(fullHtml, {
      headers: {
        "content-type": "text/html",
      },
    });
  },
};

const wrapHtml = (html: string) => `
<!doctype html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<link rel="icon" type="image/svg+xml" href="src/favicon.svg" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>Vite App</title>
	</head>
	<body>
		<div id="app">${html}</div>
		<script type="module" src="./main.jsx"></script>
	</body>
</html>
`;
