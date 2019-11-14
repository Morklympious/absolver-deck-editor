<svelte:window on:keydown={({ key }) => key === "Escape" ? service.send("BACK") : false } />

<div class="container">
    <String attacks={combo} {quadrant} on:selection={({ detail }) => service.send("NEW_TARGET", detail)} />

    <div class="selection">
        {#each pool as { stance : quadrant, attacks } (quadrant)}
            <div class="heading"> Ends in <Stance {quadrant} /> </div>
            <div class="attacks">
                {#each attacks as attack (attack.name)}
                    <Attack 
                        {attack}
                        on:selection={() => service.send("SELECTED", { attack })}
                    />
                {/each} 
            </div>
        {/each}
    </div>
</div>

{#each children as { component, children, props } }
    <svelte:component this={component} {children} {...props} />
{/each}

<script>
import { service } from "state/state.js";
import { primaries } from "stores/deck.js";

import String from "components/attack-string.svelte";
import Attack from "components/attack.svelte";
import Stance from "components/stance.svelte";

// pool comes from the context in the statechart.
export let pool;
export let children;

export let combo;
export let quadrant;
</script>

<style>
    .container {
        --attack-tile-height: 6.5rem;
        --attack-tile-width: 6.5rem;

        display: flex;
        justify-content: center;
        align-items: center;
        flex-flow: column nowrap;
        overflow: hidden;
        height: 100%;
        width: 100%;
    }

    .heading {
        display: flex;
        justify-content: center;
        align-items: center;
        
        padding: 1rem 0 0.5rem 0;

        font-size: 1.5rem;
        background: #222;
        color: white;
    }

    .attacks {
        display: flex;
        flex-flow: row wrap;

        font-size: 0.8rem;
    }

    .selection {
        background: rgba(0,0,0, 0.3);

        /* TODO: Probably repeating grid instead of hardcoding this? lmao. */
        width: 37.2rem;
        height: 30rem;
        flex: 1;

        overflow-y: scroll;
    }
</style>