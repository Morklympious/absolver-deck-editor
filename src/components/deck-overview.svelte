
{#each $primaries as { stance : origin, attacks }, row (origin)}
    <String 
        {origin}
        {attacks}
        on:selection={({ detail }) => update({ 
            origin,
            row,
            column : detail.column, 
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
    /**
     * We're now selecting a move, the pool of moves that will take us
     * to other stances is determined by the origin stance, and the 
     * slot we're targeting is a matrix coordinate.
     * 
     * If we click on a slot, it'll bubble up an event that tells us
     * which order it is, and then the string bubbles up with which row 
     * it is. B)
     */
    service.send("SELECTING", { 
        pool : followups(origin),
        slot : { row, column }
    })
}
</script>

