
{#each [...$primaries.entries() ] as [ stance, attacks ], row (stance)}
    <String 
        stance={qmap.get(stance)}
        {attacks}
        on:selection={({ detail }) => update({ 
            attack : detail.attack, 
            column : detail.column, 
            row, 

            // Which row does this belong to.
            originator : qmap.get(stance),
        })}
    />
{/each}

<script>
import { qmap, quadrants } from "utilities/quadrants.js";
import followups from "utilities/followups.js";

import String from "components/string.svelte";

import { primaries } from "stores/deck.js";
import { service } from "state/editor.js";

export let children;
export let props;
export let component;

const update = ({ attack, row, column, originator }) => {
    service.send("SELECTION", { pool : followups(originator)})
}

// NOTE: if we click an attack and it's empty, we have to look at the "last known stance"
// Which will be the string's stance if there's no previous attack, and the previous attacks
// stance if there is.
</script>

