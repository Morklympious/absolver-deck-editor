<svelte:window on:keydown={(args) => process(args)} />

<div class="selection">
    {#each pool as { stance, attacks } (stance)}
        <h2>Destination: {stance}</h2>
        {#each attacks as attack (attack.name)}
            <p on:click={() => service.send("SELECTED", { attack, ends : stance })}>
                {attack.name}
            </p>
        {/each} 
    {/each}
</div>

<script>
import { service } from "state/state.js";

// pool comes from the context in the statechart.
export let pool;

const process = ({ key }) => key === "Escape" ? service.send("BACK") : false ;
</script>

<style>
    .selection {
        background: rgba(0,0,0, 0.3);
    }
</style>