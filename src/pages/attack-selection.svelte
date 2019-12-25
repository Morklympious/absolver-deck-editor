<div class="container">
    <div class="structure">
        <String 
            quadrant={string} 
            attacks={active}
            target={slot.column}
            on:selection={
                ({ detail }) => {
                    (selected = { 
                        attack : detail.attack, 
                        quadrant : string
                    });
                    state.send("NEW_TARGET", detail)
                }
            } 
            on:deletion={
                ({ detail }) => {
                    state.send("DELETING", {
                        slot : {
                            row : slot.row,
                            column : detail.column,
                            alternate,
                        }
                    });
                }
                }
            }
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
                            equipped={$equipped.includes(attack.name)}
                            facing="{quadrant.split("_")[1]}"
                            on:selection={() => state.send("ATTACK_SELECTED", { attack })}
                            on:hover={({ detail : attack }) => {
                                (selected = { attack, quadrant })
                            }}
                        />
                    {/each} 
                </div>
            {/each}
        </div>
    </div>

    <div class="metadata">
        <div class="metadata-card">
            {#if selected}
                <Info {...selected} />
            {/if}
        </div>
    </div>
</div>

{#each children as { component, children, props } }
    <svelte:component this={component} {children} {...props} />
{/each}

<script>
import { state } from "state/state.js";
import transition from "actions/send-state.js";
import { primaries, alternates, equipped } from "stores/deck.js";

import String from "components/attack-string.svelte";
import Attack from "components/attack-tile.svelte";
import Info from "components/attack-info.svelte";
import Stance from "components/icons/stance-icon.svelte";

const back = transition("BACK");

// This all comes from the state chart.
export let pool;
export let children;
export let string;
export let slot;

let selected = false;

$: active = slot.alternate ? $alternates[slot.row] : $primaries[slot.row];
$: alternate = slot.alternate;
</script>

<style>
    .container {
        --attack-tile-height: 6.5rem;
        --attack-tile-width: 6.5rem;

        position: relative;

        display: grid;
        grid-template:
            "structure metadata" 1fr 
            / 2fr 1fr;

        overflow: hidden;
        height: 100%;
        width: 100%;
    }

    .metadata {
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .heading {
        display: flex;
        justify-content: center;
        align-items: center;
        
        padding: 1rem 0;
        margin-bottom: 0.25rem;

        font-size: 1.5rem;
        background: #222;
        color: white;
        touch-action: none;
    }

    .attacks {
        display: grid;
        grid-gap: 0.2rem;

        padding: 0 0.2rem;

        grid-template-columns: repeat(5, var(--attack-tile-width));
        flex-flow: row wrap;

        font-size: 0.8rem;

        flex: 1;
    }

    .selection {
        background: rgba(0,0,0, 0.3);

        /* TODO: Probably repeating grid instead of hardcoding this? lmao. */
        height: 70vh;

        overflow-y: scroll;
        padding: 0 0 0.5rem 0;
    }

    .structure {
        display: flex;
        justify-content: center;
        align-items: center;
        flex-flow: column nowrap;

        grid-area: structure;

        overflow: hidden;
    }
</style>
