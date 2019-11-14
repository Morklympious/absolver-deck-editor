<div class="flex container" on:click="{() => bubble("selection", attack)}">
    {empty ? "empty" : name} 
</div>

<script>
import { createEventDispatcher } from "svelte";
import followups from "utilities/followups.js";

// Dispatch events that parents will do things with.
const bubble = createEventDispatcher();

export let attack = false;

$: ({
    name,
    height,
    type,
    stance,
    modifiers
} = attack);

$: empty = !Boolean(name);
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

        /* TODO: Border when highlighted */
        margin: 0.1rem;
        
        background-color: #333;
        color: #FFF;

        cursor : pointer;
    }

    .attack {
        height: 100%;
        width: 100%;

        background-color: #333;
        background-size: contain;
        background-repeat: no-repeat;
        background-position: center;
    }

    .empty {
        background-color: gold;
    }

    .data {
        position: absolute;
        top: 0.2rem;
        left: 0.2rem;

        width: 100%;
    }

    .name {
        padding: 0.1rem;
        font-size: 0.6rem;
        font-weight: bold;
        
        color: white;
    }

    .modifiers {
        top: 0.2rem;
        left: 0.2rem;
    }
</style>