<svelte:body
    on:keyup={({ keyCode }) => {
        console.log(keyCode);
        keyCode === 27 ? state.send("BACK") : false;
    }}
/>

<div class="application variables" data-overview={overview}>
    <div class="menu">
        <Hamburger />
        <span class="weapon">{$weapon}</span>
        <SideDrawer />
    </div>

    <div class="content" on:click={conditionalhide}>
        <svelte:component this={component} {children} {...props} />
    </div>

    <div class="footer">
        <span class="text"
            >Authored by <a href="https://twitter.com/morklympious"
                >Morklympious</a
            ></span
        >
    </div>
</div>

<script>
    import { tree, state } from "state/state.js";
    import { decode } from "utilities/encoder.js";
    import hydrate from "utilities/url-hydrate.js";

    import Hamburger from "components/menu/hamburger.svelte";
    import SideDrawer from "components/menu/side-drawer.svelte";

    import weapon from "stores/weapon.js";
    let components = [];

    $: [root = false] = components;
    $: ({ component, children, props } = root);
    $: overview = $state.matches("overview");
    $: selecting = !overview;

    // We only care about the first chart
    tree(([structure]) => {
        components = structure.children;
    });

    // We hydrate the deck if a shared param exists, This is what allows you to share decks.
    const params = new URLSearchParams(window.location.search);
    const deck = params.has("deck") ? params.get("deck") : false;

    if (deck) {
        const decoded = decode(params.get("deck"));

        hydrate(decoded);
    }

    const conditionalhide = () =>
        $state.matches("menu.shown") ? state.send("HIDE_MENU") : false;
</script>

<style>
    .variables {
        --color-mork-cream: #f7f4ea;
        --color-mork-dark-blue: #5f6a85;
        --color-mork-deep-blue: #21243d;
        --color-mork-red: #e98fa0;

        --color-gold: #fbf5dc;
        --color-gray: #545255;
        --color-gray-darker: #444;
        --color-gray-lighter: #677479;

        --color-modifier-break: #f9993e;
        --color-modifier-stop: #d6392a;
        --color-modifier-charge: #cce4ea;
        --color-modifier-avoid: #eada98;
        --color-modifier-parry: #3d2dce;

        --color-hit-right: #db5746;
        --color-hit-left: #4ea2d3;
        --color-hit-both: #c25ce8;

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

        background: rgb(59, 66, 84);
        background: linear-gradient(
            315deg,
            rgba(59, 66, 84, 1) 25%,
            rgba(95, 106, 133, 1) 75%
        );

        transition: background-position 250ms ease;
    }

    .application[data-overview="false"] {
        background-position: 100% 0;
    }

    .menu {
        display: flex;
        justify-content: flex-start;
        align-items: center;
        padding: 1.8rem 1rem 1rem 1rem;
    }

    .weapon {
        font-size: 2rem;
        margin-left: 1rem;
        color: var(--color-mork-cream);
    }

    .content {
        padding: 1.5rem 0;
        overflow: hidden;

        flex: 1;
    }

    @media only screen and (min-device-width: 320px) and (max-device-width: 568px) and (-webkit-min-device-pixel-ratio: 2) {
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

    .footer {
        display: flex;
        height: 3rem;
        padding: 0 1rem;

        font-size: 1.2rem;
        color: var(--color-mork-cream);
    }

    a {
        color: var(--color-mork-deep-blue);
    }
</style>
