<div class="flex container" on:click="{() => bubble("selection", attack)}">
    {name}
</div>

<script>
import { createEventDispatcher } from "svelte";
import followups from "utilities/followups.js";

// Dispatch events that parents will do things with.
const bubble = createEventDispatcher();

// The move really only cares where it originates (for followups), not where it goes.

export let attack = false;

$: ({
    name,
    height,
    type,
    stance,
    modifiers
} = attack);

// Determine whether or not this attack has any data in it.
$: empty = !Boolean(attack);

</script>

<style>
    .flex {
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .container {
        position: relative;

        height: 8rem;
        width: 8rem;

        /* TODO: Border when highlighted */
        border: 0.2rem solid #444;
        background-color: #333;
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