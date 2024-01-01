import fs from "node:fs";
import path from "node:path";
import { type ViteDevServer } from "vite";
import { createWorkerdHandler } from "vite-workerd-request-handler";

export function preactWorkerdSSR() {
  return {
    name: "preact-workerd-ssr",
    configureServer(server: ViteDevServer) {
      return () => {
        const handler = createWorkerdHandler({
          entrypoint: "./entry-server.jsx",
          server,
          requestHandler: ({ request, entrypointModule }) => {
            const url = request.url;
            const renderedString = (entrypointModule as any).render(url);
            return new Response(renderedString);
          },
        });

        server.middlewares.use(async (req, res, next) => {
          if (req.originalUrl !== "/") {
            // the request is not for the root nor the workerd loader, so
            // it's not for us to handle

            // NOTE: this works fine with preact, but in general we want to handle all
            // incoming requests, we need to find a way to discern which requests we need
            // to handle and which we don't (for example we never want to intercept static
            // asset requests!)
            next();
            return;
          }

          const url = req.originalUrl;

          try {
            let template = fs.readFileSync(
              path.resolve(".", "index.html"),
              "utf-8",
            );

            template = await server.transformIndexHtml(url, template);

            const ssrResponse = await handler(req);

            if (ssrResponse.status !== 200) {
              res.statusCode = ssrResponse.status;
              res.statusMessage = ssrResponse.statusText;
              res.end(await ssrResponse.text());
              return;
            }

            const body = await ssrResponse.text();
            const html = template.replace(`<!--app-html-->`, body);

            res.statusCode = 200;

            res.setHeader("Content-Type", "text/html");
            res.end(html);
          } catch (e) {
            server.ssrFixStacktrace(e);
            next(e);
          }
        });
      };
    },
  };
}
