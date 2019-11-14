<svelte:window on:keydown={({ key }) => key === "Escape" ? service.send("BACK") : false } />

<div class="variables">
    <String attacks={combo} {quadrant} on:selection={({ detail }) => service.send("NEW_TARGET", detail)} />
</div>

<div class="variables selection">
    {#each pool as { stance, attacks } (stance)}
        <h1>Destination: {stance}</h1>
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

{#each children as { component, children, props } }
    <svelte:component this={component} {children} {...props} />
{/each}

<script>
import { service } from "state/state.js";
import { primaries } from "stores/deck.js";

import String from "components/attack-string.svelte";
import Attack from "components/attack.svelte";

// pool comes from the context in the statechart.
export let pool;
export let children;

export let combo;
export let quadrant;
</script>

<style>
    .variables {
        --attack-tile-height: 6rem;
        --attack-tile-width: 6rem;
    }

    .attacks {
      

        display: flex;
        flex-flow: row wrap;

        font-size: 0.8rem;
    }
    .selection {
        background: rgba(0,0,0, 0.3);
    }
</style>