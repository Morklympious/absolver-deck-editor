<div class="application">
    <div class="menu">
        <MenuBar />
    </div>

    <div class="content">
        <svelte:component 
            this={component}
            {children}
            {...props}
        />
    </div>
</div>

<script>
import { tree } from "state/state.js";
import { decode } from "utilities/encoder.js";
import hydrate from "utilities/url-hydrate.js";


import MenuBar from "components/menu-bar.svelte";

let components = [];

$: [ root = false ] = components;
$: ({ component, children, props } = root);

// If you use the each, spread this in the svelte:component because otherwise child components don't... get there.
// const workaround = {};

// We only care about the first chart
tree(([ structure ]) => {
    components = structure.children;
});

// We hydrate the deck if a shared param exists, This is what allows you to share decks.
const params = new URLSearchParams(window.location.search);
const deck = params.has("deck") ? params.get("deck") : false;

if(deck) {
    const decoded = decode(params.get("deck"));

    hydrate(decoded);
}
</script>

<style>
    .application {
        display: grid;

        grid-template: 
            "menu" 4rem
            "content" 1fr
            / 1fr;

        height: 100%;
    }

    .menu {
        grid-area: menu;
    }

    .content {
        grid-area: content;
        padding: 1.5rem 0;

        overflow: hidden;
    }
</style>
