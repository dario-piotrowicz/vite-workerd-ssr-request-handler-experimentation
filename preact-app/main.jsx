import { render } from "preact";
import Component from "./Component.jsx";
import { getTitle } from "./title.js";

render(
	<Component url={location.pathname} title={getTitle()} />,
	document.getElementById("app"),
);
