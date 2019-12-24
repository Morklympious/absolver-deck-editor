<div 
    class="flex container" 
    data-current-target={target}
    data-equipped={equipped}
    {style}
    on:click={() => bubble("selection", attack)}
    on:mouseenter={() => bubble("hover", attack)}
    use:click
    use:hover
>
    {#if empty}
        <EmptyIcon />
    {:else}    
        <div class="style">
            <StyleIcon style={attack.style} />
        </div>

        <div class="meta">
            {#if modifiers.includes("double")}
            <div class="meta-trait">DBL</div>
            {/if}

            {#if modifiers.includes("break")}
            <div class="meta-trait">GRB</div>
            {/if}

            {#if modifiers.includes("stop")}
            <div class="meta-trait">STP</div>
            {/if}

            {#if modifiers.includes("jump")}
            <div class="meta-trait">JMP</div>
            {/if}

            {#if modifiers.includes("duck")}
            <div class="meta-trait">DUC</div>
            {/if}

            {#if modifiers.includes("strafe")}
            <div class="meta-trait">STF</div>
            {/if}
        </div>
    {/if}
</div>

<script>
import { createEventDispatcher } from "svelte";
import followups from "utilities/followups.js";
import { click, hover } from "actions/audio.js";

import EmptyIcon from "components/icons/empty-icon.svelte";
import StyleIcon from "components/icons/style-icon.svelte";

// Dispatch events that parents will do things with.
const bubble = createEventDispatcher();

export let attack = false;
export let target = false;
export let equipped = false;

$: ({
    name      = "",
    height    = "mid",
    type      = "thrust",
    stance    = false,
    frames    = false,
    modifiers = [],
    _meta     = {}
} = attack);

$: empty = _meta.empty;
$: art = name.split(" ").join("-").toLowerCase();
$: style = art ? `background-image: url("assets/images/${art}.png")` : ``;
</script>

<style>

    @keyframes oscillate {
        0% {
            outline: 0.15rem solid var(--color-gold);
        }

        50% {
            outline : 0.15rem solid transparent;
        }

        100% {
            outline: 0.15rem solid var(--color-gold);
        }
    }

    .flex {
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .container {
        position: relative;

        height: var(--attack-tile-height, 8rem);
        width: var(--attack-tile-height, 8rem);
        
        background-color: rgba(0, 0, 0, 0.55);
        color: #FFF;

        background-size: contain;
        background-position: center;
        background-repeat: no-repeat;

        cursor : pointer;
        user-select: none;

        filter: drop-shadow(0px 0px 2px var(--color-gold))
    }

    .container:hover,
    .container[data-current-target="true"] {
        animation-name: oscillate;
        animation-duration: 1.5s;
        animation-iteration-count: infinite;
    }
    
    .container[data-equipped="true"]::before {
        position: absolute;
        content: "";

        right: 0;
        top: 0;

        height: 1rem;
        width: 1rem;

        margin: 0.15rem;
        padding: 0.15rem;

        background-image: url(components/icons/equipped-icon.svg);
        background-color: var(--color-equipped-icon-background);
        border-radius: 50%;
    }

    .style {
        display: flex;
        flex-flow: row nowrap;
        width: 100%; 
        height: 1rem;
        padding: 0.2rem;

        position: absolute;
        top: 0;

        font-size: 0.6rem;

    }

    .meta {
        display: flex;
        flex-flow: row nowrap;
        width: 100%; 
        height: 1rem;
        padding: 0.2rem;

        position: absolute;
        bottom: 0;

        font-size: 0.6rem;

    }

    .meta-trait + .meta-trait {
        padding: 0 0.2rem;
    }
</style>