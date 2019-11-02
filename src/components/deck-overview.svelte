
{#each [...$primaries.entries() ] as [ stance, attacks ], row (stance)}
    <String 
        stance={qmap.get(stance)}
        {attacks}
        on:selection={({ detail }) => update({ 
            attack : detail.attack, 
            column : detail.column, 
            row, 
        })}
    />
{/each}

<script>
import { qmap, quadrants } from "utilities/quadrants.js";
import String from "components/string.svelte";

import { primaries } from "stores/deck.js";

export let children;
export let props;
export let component;

const update = ({ attack, row, column }) => {
    console.log({ attack, row, column })
}
</script>

