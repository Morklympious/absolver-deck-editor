<svelte:window on:keydown={({ key }) => key === "Escape" ? service.send("BACK") : false } />

<div class="container">
    <button class="back" on:click={() => service.send("BACK")}> BACK </button>
    <div class="structure">
        <String 
            quadrant={string} 
            attacks={active}
            target={slot.column}
            on:selection={({ detail }) => service.send("NEW_TARGET", detail)} 
        />

        <div class="selection">
            {#each pool as { stance : quadrant, attacks } (quadrant)}
                <div class="heading"> 
                    Ends in <Stance {quadrant} /> 
                </div>
                <div class="attacks">
                    {#each attacks as attack (attack.name)}
                        <Attack 
                            {attack}
                            on:selection={() => service.send("ATTACK_SELECTED", { attack })}
                            on:hover={({ detail : attack }) => (selected = attack)}
                        />
                    {/each} 
                </div>
            {/each}
        </div>
    </div>

    <div class="metadata">
        <div class="metadata-card">
            {#if selected}
            <h1>{selected.name}</h1>
            <div class="attack">
            
            </div>
            <div class="stats">
                Coming Soon!
            </div>
            {/if}
        </div>
    </div>
</div>

{#each children as { component, children, props } }
    <svelte:component this={component} {children} {...props} />
{/each}

<script>
import { service } from "state/state.js";
import { primaries, alternates } from "stores/deck.js";

import String from "components/attack-string.svelte";
import Attack from "components/attack.svelte";
import Stance from "components/icons/stance-icon.svelte";

// This all comes from the state chart.
export let pool;
export let children;
export let combo;
export let quadrant;
export let string;
export let target;
export let slot;

let selected = false;

$: active = slot.alternate ? $alternates[slot.row] : $primaries[slot.row];
</script>

<style>
    .back {
        position: absolute;
        top: 0;
        left: 0;

        margin: 2rem;

        height: 2rem;
        width: 4rem;
    }

    .container {
        --attack-tile-height: 6.5rem;
        --attack-tile-width: 6.5rem;

        display: grid;
        grid-template:
            "structure metadata" 1fr 
            / 2fr 1fr;

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
        display: grid;
        grid-gap: 0.2rem;

        padding: 0 0.2rem;

        grid-template-columns: repeat(5, var(--attack-tile-width));
        flex-flow: row wrap;

        font-size: 0.8rem;
    }

    .selection {
        background: rgba(0,0,0, 0.3);

        /* TODO: Probably repeating grid instead of hardcoding this? lmao. */
        height: 30rem;

        overflow-y: scroll;
    }

    .structure {
        display: flex;
        justify-content: center;
        align-items: center;
        flex-flow: column nowrap;

        grid-area: structure;
    }
    
    .metadata {
        grid-area: metadata;

        display: flex;
        justify-content: center;
        align-items: center;

        color: #CCC;
    }

    .metadata-card {
        display: flex;
        justify-content: center;
        align-items: center;
        flex-flow: column nowrap;
    }

    .stats {
        padding: 1rem;
        background: #444;
        display: flex;
        justify-content: center;
        align-items: center;
    }
</style>