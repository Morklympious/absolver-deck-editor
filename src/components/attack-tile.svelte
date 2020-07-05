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
    {#if _meta.empty}
        <EmptyIcon />
    {:else}   
        {#if deletable}
        <div class="delete" on:click|stopPropagation={() => bubble("deletion")}> delete </div>
        {/if}
        <div class="style">
            <StyleIcon style={attack.style} />
        </div>

        <div class="meta">
            {#each modifiers as modifier}   
                {#if modifier === "double"}
                <div class="meta-trait">2X</div>
                {:else}
                <div class="meta-trait" style="{stylize(modifier)}"></div>
                {/if}
            {/each}
        </div>
    {/if}
</div>

<script>
import { createEventDispatcher } from "svelte";
import followups from "utilities/followups.js";
import { click, hover } from "actions/audio.js";

import EmptyIcon from "components/icons/empty-icon.svelte";
import StyleIcon from "components/icons/style-icon.svelte";

const fallback = (value, fallback) => (value ? value : fallback);

const bubble = createEventDispatcher();

export let attack = false;
export let target = false;
export let equipped = false;
export let deletable = false;

$: name      = fallback(attack.name, "");
$: height    = fallback(attack.height, "");
$: type      = fallback(attack.type, "");
$: stance    = fallback(attack.stance, {});
$: frames    = fallback(attack.frames, {});
$: modifiers = fallback(attack.modifiers, []);
$: _meta     = fallback(attack._meta, {});

$: art = name.split(" ").join("-").toLowerCase();
$: style = art ? `background-image: url("assets/images/${art}.png")` : ``;

const stylize = (modifier) => `background-image: url("assets/modifiers/${modifier}.svg")`
</script>

<style>
    @keyframes oscillate {
        0% {
            outline: 0.15rem solid var(--color-gold);
        }

        50% {
            outline: 0.15rem solid transparent;
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

        height: var(--deck-overview-attack-tile-height);
        width: var(--deck-overview-attack-tile-width);
        
        background-color: rgba(0, 0, 0, 0.55);
        color: #FFF;

        background-size: 90%;
        background-position: center;
        background-repeat: no-repeat;

        cursor : pointer;
        user-select: none;
    }

    .container:hover,
    .container[data-current-target="true"] {
        animation-name: oscillate;
        animation-duration: 1.5s;
        animation-iteration-count: infinite;
    }

    .container .delete {
        display: none;
    }

    .container:hover .delete {
        display: block;
        color: #ff4d4d;
        position: absolute;
        top: 0;
        right: 0;
        z-index: 2;
        font-size: 0.8rem;
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
        background-size: 80%;
        background-repeat: no-repeat;
        background-position: center;
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
        padding: 0.2rem;

        position: absolute;
        bottom: 0;

        font-size: 0.6rem;

        justify-content: flex-end;
    }

    .meta-trait + .meta-trait {
        padding: 0 0.2rem;
    }

    .meta-trait {
        height: 1rem;
        width: 1rem;

        display: flex;
        align-items: center;
        justify-content: center;
    }
</style>