<div class="overview">
    <div class="primaries">
        {#each primary as { attacks, quadrant }, row}
            <String 
                {quadrant}
                {attacks}
                on:selection={({ detail }) =>    
                    service.send("SELECTING", { 
                        quadrant : detail.quadrant,

                        row,
                        column : detail.column,
                        alternate : false,
                    }
                )}
            />
        {/each}
    </div>

    <div class="alternates">
        {#each $alternates as { attacks, quadrant }, row}
            <String 
                {quadrant}
                {attacks}
                on:selection={({ detail }) =>    
                    service.send("SELECTING", { 
                        quadrant,

                        row,
                        column : detail.column,
                        alternate : true,
                    }
                )}
            />
        {/each}
    </div>
</div>

<script>
import followups from "utilities/followups.js";

import String from "components/attack-string.svelte";

import { primaries, alternates } from "stores/deck.js";
import { service } from "state/state.js";

$: primary = $deck.primaries;
$: alternate = $deck.alternates;

const update = ({ row, column, stance, from, alternate = false }) => {
    /**
     * We're now selecting a move, the pool of moves that will take us
     * to other stances is determined by the origin stance, and the 
     * slot we're targeting is a matrix coordinate.
     */
    service.send("SELECTING", { 
        
        // Passing in stance might allow an attack to know how to end itself. 
        stance,

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
            / 1fr 1fr 2fr;

        height: 100%;
        width: 100%;
        overflow: hidden;
    }

    .primaries {
        grid-area: primaries;
    }

    .alternates {
        grid-area: alternates;
    }
</style>

