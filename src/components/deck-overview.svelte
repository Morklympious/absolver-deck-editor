
{#each $primaries as { stance, attacks }, row (stance)}
    <String 
        origin={stance}
        {attacks}
        on:selection={({ detail }) => update({ 
            attack : detail.attack, 
            column : detail.column, 
            row,
            origin : stance
        })}
    />
{/each}

<script>
import { qmap, quadrants } from "utilities/quadrants.js";
import followups from "utilities/followups.js";

import String from "components/attack-string.svelte";

import { primaries } from "stores/deck.js";
import { service } from "state/state.js";

const update = ({ row, column, origin }) => {
    service.send("SELECTING", { 
        pool   : followups(origin),
        target : { row, column }
    })
}

// NOTE: if we click an attack and it's empty, we have to look at the "last known stance"
// Which will be the string's stance if there's no previous attack, and the previous attacks
// stance if there is.
</script>

