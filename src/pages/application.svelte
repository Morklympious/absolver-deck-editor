<div class="application variables" data-overview="{overview}">
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
import { tree, state } from "state/state.js";
import { decode } from "utilities/encoder.js";
import hydrate from "utilities/url-hydrate.js";


import MenuBar from "components/menu-bar.svelte";

let components = [];

$: [ root = false ] = components;
$: ({ component, children, props } = root);
$: overview = $state.matches("overview");
$: selecting = !overview

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
    .variables {
        --color-gold: #FBF5DC;
        --color-gray: #545255;
        --color-gray-darker: #444;
        --color-gray-lighter: #677479;

        --color-equipped-icon-background: #e0c220;

        --attack-info-container-width: 16rem;
        
        --deck-overview-attack-tile-height: 6.5rem;
        --deck-overview-attack-tile-width: 6.5rem;
    }

    .application {

        display: grid;

        grid-template: 
            "menu" 4rem
            "content" 1fr
            / 1fr;

        height: 100%;
        font-family: FjallaOne, sans-serif;

        background: 
            linear-gradient(to right, rgba(0,0,0, 0.5), rgba(0,0,0, 0.5)),
            url("assets/backgrounds/application-background.jpg");

        background-position: 0 0;
        background-repeat: no-repeat;

        transition: background-position 250ms ease;
    }

    .application[data-overview="false"]  {            
        background-position: 100% 0;
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
