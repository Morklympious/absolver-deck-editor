<div class="overview">
    <div class="primaries">
        {#each $primaries as { stance, attacks, flow }, row (stance)}
            <String 
                {stance}
                {attacks}
                 on:selection={({ detail }) => update({
                    row, 
                    column : detail.column,
                    from   : detail.from,

                    alternate : false,
                })}
            />
        {/each}
    </div>

    <div class="alternates">
        {#each $alternates as { stance, attacks, flow }, row (stance)}
            <String 
                {stance}
                {attacks}
                on:selection={({ detail }) => update({
                    row, 
                    column : detail.column,
                    from   : detail.from,

                    alternate : true,
                })}
            />
        {/each}
    </div>
</div>

<script>
import followups from "utilities/followups.js";

import String from "components/attack-string.svelte";

import { primaries, alternates } from "stores/deck.js";

const update = ({ row, column, from, alternate = false }) => {
    /**
     * We're now selecting a move, the pool of moves that will take us
     * to other stances is determined by the origin stance, and the 
     * slot we're targeting is a matrix coordinate.
     */
    service.send("SELECTING", { 
        // Where the stance originates + if it's an alternate cell (meaning no step cancels)
        origin : from,
        alternate,

        slot : { row, column, alternate },
    })
}
</script>

<style>
    .overview {
        display: grid;

        grid-template: 
            "primaries . alternates" 100%
            / 1fr 1fr 1fr;
    }
</style>

