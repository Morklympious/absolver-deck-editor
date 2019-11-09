<svelte:window on:keydown={({ key }) => key === "Escape" ? service.send("BACK") : false } />

<div class="selection">
    {#each pool as { stance, attacks } (stance)}
        <h1>Destination: {stance}</h1>
        <div class="attacks">
            {#each attacks as attack (attack.name)}
                <Attack 
                    {attack}
                    on:selection={() => service.send("SELECTED", {
                        attack,
                        ends : stance
                    })}
                />
            {/each} 
        </div>
    {/each}
</div>

<script>
import { service } from "state/state.js";
import { primaries } from "stores/deck.js";

import String from "components/attack-string.svelte";
import Attack from "components/attack.svelte";

// pool comes from the context in the statechart.
export let pool;

$: console.log({ pool })
</script>

<style>
    .attacks {
        display: flex;
        flex-flow: row wrap;
    }
    .selection {
        background: rgba(0,0,0, 0.3);
    }
</style>