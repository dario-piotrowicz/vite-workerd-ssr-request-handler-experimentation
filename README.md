# Vite workerd ssr request handler experimentation

This repository shows an experimentation which consists in making a preact application
be server side rendered using the Cloudflare workerd runtime when run locally with the Vite
dev server.

## To run the application

Install the dependencies:

```
pnpm i
```

and simply run the preact app with:

```
pnpm preact:dev
```

## Details

In this experimentation we've created a new vite plugin [preact-workerd-ssr-plugin](https://github.com/dario-piotrowicz/vite-workerd-ssr-request-handler-experimentation/tree/main/preact-workerd-ssr-plugin) and [added it to the app's Vite config plugins field](https://github.com/dario-piotrowicz/vite-workerd-ssr-request-handler-experimentation/blob/b7cd933cec66bae2ff90fe6b96f1d57fc7a7528f/preact-app/vite.config.js#L15).

<details>
<summary>Note regarding the plugin</summary>

Instead of creating a new plugin we could have modified the existing preact one instead, we didn't simply for simplicity and because preact's implementation allows it.

We've experimented with other frameworks as well and in other cases it might be necessary to add this to the Vite plugin itself, alongside other minor changes, in order to not conflict with its behavior.

</details>
<br>

What the new plugin does is to intercept ([using a middleware](https://github.com/dario-piotrowicz/vite-workerd-ssr-request-handler-experimentation/blob/b7cd933cec66bae2ff90fe6b96f1d57fc7a7528f/preact-workerd-ssr-plugin/src/plugin.ts#L21)) incoming requests and instead of having them handled in the standard Node.js runtime passes them to a [handler we defined](https://github.com/dario-piotrowicz/vite-workerd-ssr-request-handler-experimentation/blob/b7cd933cec66bae2ff90fe6b96f1d57fc7a7528f/preact-workerd-ssr-plugin/src/plugin.ts#L11-L19) that handles them (/performs server side rendering) in the workerd runtime instead, afterwords [the response from the handler is simply used to return an HTML response to the user](https://github.com/dario-piotrowicz/vite-workerd-ssr-request-handler-experimentation/blob/b7cd933cec66bae2ff90fe6b96f1d57fc7a7528f/preact-workerd-ssr-plugin/src/plugin.ts#L44-L59).

The above mentioned handler is created using the [createWorkerdHandler](https://github.com/dario-piotrowicz/vite-workerd-ssr-request-handler-experimentation/blob/b7cd933cec66bae2ff90fe6b96f1d57fc7a7528f/vite-workerd-request-handler/src/index.ts#L7) function from the [vite-workerd-request-handler](https://github.com/dario-piotrowicz/vite-workerd-ssr-request-handler-experimentation/tree/b7cd933cec66bae2ff90fe6b96f1d57fc7a7528f/vite-workerd-request-handler) package (note: this doesn't really need to be its own standalone package, we did it so that it would be easier to reuse when experimenting with other frameworks).

### createWorkerdHandler

The `createWorkerdHandler` takes three values as inputs:

- entrypoint: the entrypoint file for the application
- server: the viteDevServer, which the handler needs to integrate with
- requestHandler: framework specific logic on how requests should be handled

What the function then does is:

- [start a new miniflare instance in which the code can be run](https://github.com/dario-piotrowicz/vite-workerd-ssr-request-handler-experimentation/blob/b7cd933cec66bae2ff90fe6b96f1d57fc7a7528f/vite-workerd-request-handler/src/index.ts#L21-L27)
- [register a new "workerd loader" middleware](https://github.com/dario-piotrowicz/vite-workerd-ssr-request-handler-experimentation/blob/b7cd933cec66bae2ff90fe6b96f1d57fc7a7528f/vite-workerd-request-handler/src/index.ts#L30-L31), which is used to allow the workerd code to dynamically load modules
- simply [returns a handler](https://github.com/dario-piotrowicz/vite-workerd-ssr-request-handler-experimentation/blob/b7cd933cec66bae2ff90fe6b96f1d57fc7a7528f/vite-workerd-request-handler/src/index.ts#L52C30-L52C30) that can be used by the vite plugin

### How the code runs in workerd

When we instantiate the miniflare instance we pass to it a [specific script](https://github.com/dario-piotrowicz/vite-workerd-ssr-request-handler-experimentation/blob/b7cd933cec66bae2ff90fe6b96f1d57fc7a7528f/vite-workerd-request-handler/src/workerdBootloader.js.txt) that allows it to interact and lazily load modules from the Vite dev server.

<details>

<summary>Note regarding replaced values</summary>

In the script [WORKERD_APP_ENTRYPOINT](https://github.com/dario-piotrowicz/vite-workerd-ssr-request-handler-experimentation/blob/b7cd933cec66bae2ff90fe6b96f1d57fc7a7528f/vite-workerd-request-handler/src/workerdBootloader.js.txt#L9C1-L9C1), [\_\_REQUEST_HANDLER\_\_](https://github.com/dario-piotrowicz/vite-workerd-ssr-request-handler-experimentation/blob/b7cd933cec66bae2ff90fe6b96f1d57fc7a7528f/vite-workerd-request-handler/src/workerdBootloader.js.txt#L11) and [VITE_SERVER_ADDRESS](https://github.com/dario-piotrowicz/vite-workerd-ssr-request-handler-experimentation/blob/b7cd933cec66bae2ff90fe6b96f1d57fc7a7528f/vite-workerd-request-handler/src/workerdBootloader.js.txt#L43C42-L43C61) are simply placeholders that we [replace](https://github.com/dario-piotrowicz/vite-workerd-ssr-request-handler-experimentation/blob/b7cd933cec66bae2ff90fe6b96f1d57fc7a7528f/vite-workerd-request-handler/src/miniflare.ts#L30-L32) with the actual proper values when instantiating miniflare.

</details>
<br>

Such dynamic import behavior is implemented via the `UNSAFE_EVAL` binding which allows us to evaluate code in workerd, what we basically do is providing our own implementation of the Vite module resolution functions (`__vite_ssr_import__`, `__vite_ssr_dynamic_import__`, etc...) which interact with the Vite dev server and when necessary fetch module code (thanks to the "workerd loader" we set up earlier) and evaluate it (we took inspiration for the above from [vite-node](https://github.com/vitest-dev/vitest/tree/main/packages/vite-node) as the concept is pretty similar).

### Potential issues with this approach

- this approach relies on the framework providing/allowing a single clean handler that takes a request and generate/returns a response, other frameworks (such as qwik) can do more complex things and effectively needing to run server side code throughout different parts of the request handling process making this approach not applicable (we also experimented with a more complex variation of this approach which does allow for such more complex request processing, at the cost of a more complex architecture)
- Vite module resolution allows for modules to use cjs as well as the Vite specific module resolution functions, in workerd we do provide out own implementation for the Vite functions but we cannot handle cjs modules there, this is a limitation that needs to be kept in mind
