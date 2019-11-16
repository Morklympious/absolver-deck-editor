<div 
    class="flex container" 
    data-current-target={target}
    {style}
    on:click={() => bubble("selection", attack)}
    on:mouseenter={() => bubble("hover", attack)}
    use:click
    use:hover
>
    <!-- {name || "Empty"} -->

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
    </div>
</div>

<script>
import { createEventDispatcher } from "svelte";
import followups from "utilities/followups.js";
import { click, hover } from "actions/audio.js";

// Dispatch events that parents will do things with.
const bubble = createEventDispatcher();

export let attack = false;
export let target;

$: ({
    name = "",
    height,
    type,
    stance,
    modifiers = []
} = attack);

$: art = name.split(" ").join("-").toLowerCase();
$: style = art ? `background-image: url("assets/images/barehands/${art}.png")` : ``;
</script>

<style>
    .flex {
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .container {
        position: relative;

        height: var(--attack-tile-height, 8rem);
        width: var(--attack-tile-height, 8rem);
        
        background-color: #333;
        color: #FFF;

        background-size: contain;
        background-position: center;
        background-repeat: no-repeat;

        cursor : pointer;
    }

    .container[data-current-target="true"] {
        box-shadow: 0 0 0.5rem 0.2rem inset rgb(255, 234, 116);
    }

    .container:hover {
        outline: 0.15rem solid;
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