<div class="application variables" data-overview="{overview}">
    <div class="menu">
        <!-- <MenuBar /> -->
        <Hamburger />
        <SideDrawer />
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

import Hamburger from "components/menu/hamburger.svelte";
import SideDrawer from "components/menu/side-drawer.svelte";

let components = [];

$: [ root = false ] = components;
$: ({ component, children, props } = root);
$: overview = $state.matches("overview");
$: selecting = !overview;

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
        --color-mork-cream: #f7f4ea;
        --color-mork-dark-blue: #5F6A85;

        --color-gold: #FBF5DC;
        --color-gray: #545255;
        --color-gray-darker: #444;
        --color-gray-lighter: #677479;

        --color-equipped-icon-background: #e0c220;

        --attack-info-container-width: 16rem;

        --deck-overview-attack-tile-height: 6.5rem;
        --deck-overview-attack-tile-width: 6.5rem;

        --attack-selection-attack-tile-width: 6.5rem;
        --attack-selection-attack-tile-height: 6.5rem;
    }

    .application {

        display: flex;
        flex-flow: column nowrap;

        height: 100%;
        font-family: roboto, sans-serif;

        background: 
            linear-gradient(to right, rgba(0,0,0, 0.5), rgba(0,0,0, 0.5));

        background-position: 0 0;
        background-repeat: no-repeat;

        transition: background-position 250ms ease;
    }

    .application[data-overview="false"]  {            
        background-position: 100% 0;
    }

    .menu {
        padding: 1rem;
    }

    .content {
        padding: 1.5rem 0;
        overflow: hidden;
    }

    @media only screen 
    and (min-device-width: 320px) 
    and (max-device-width: 568px)
    and (-webkit-min-device-pixel-ratio: 2) {
        .variables {
            --deck-overview-attack-tile-height: 16rem;
            --deck-overview-attack-tile-width: 16rem;
            --deck-overview-deck-display: block;

            /* attack-selection.svelte */
            --attack-selection-attack-tile-height: 10rem;
            --attack-selection-attack-tile-width: 10rem;
            --attack-selection-container-display: block;
            --attack-selection-attack-pool-width: 100%;
            --attack-selection-grid-template-columns: repeat(3, 1fr);

            /* attack-info.svelte */
            --attack-selection-attack-info-display: none;
        }

        .application {
            background: none;
        }

        .content {
            overflow: auto;
        }
    }

</style>
