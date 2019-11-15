<div 
    class="flex container" 
    {style}
    on:click="{() => bubble("selection", attack)}" 
>
    <!-- {name || "Empty"} -->

    <div class="meta">
        {#if modifiers.includes("double")}
        <div class="double">2x</div>
        {/if}
    </div>
</div>

<script>
import { createEventDispatcher } from "svelte";
import followups from "utilities/followups.js";

// Dispatch events that parents will do things with.
const bubble = createEventDispatcher();

export let attack = false;

$: ({
    name = "",
    height,
    type,
    stance,
    modifiers = []
} = attack);

$: empty = !Boolean(name);
$: art = name.split(" ").join("-").toLowerCase();

$: style = art ? `background-image: url("images/barehands/${art}.png")` : ``;
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

    .container:hover {
        outline: 0.15rem solid;
    }

    .meta {
        width: 100%; 
        height: 1rem;
        padding: 0.2rem;

        position: absolute;
        bottom: 0;

        font-size: 0.6rem;

    }
</style>