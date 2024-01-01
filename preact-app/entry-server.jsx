import preactRender from "preact-render-to-string";
import Component from "./Component";

const title = await import("./title").then((m) => m.getTitle());

export function render(url) {
  return preactRender(
    Component({ url, title: title + " (Server Side Rendered!)" }),
  );
}
