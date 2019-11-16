<div class="overview">
    <div class="area primaries">
        {#each primary as { attacks, quadrant }, row}
            <String 
                {quadrant}
                {attacks}
                on:selection={({ detail }) =>    
                    service.send("SELECTING", { 
                        string   : quadrant,
                        quadrant : detail.quadrant,
                        attack   : detail.attack,

                        combo : attacks,
                        slot  : {
                            row,
                            column    : detail.column,
                            alternate : false,
                        }
                    }
                )}
            />
        {/each}
    </div>

    <div class="area alternates">
        {#each alternate as { attacks, quadrant }, row}
            <String 
                {quadrant}
                {attacks}
                on:selection={({ detail }) =>    
                    service.send("SELECTING", { 
                        quadrant,
                        attack : detail.attack,
                        
                        combo : attacks,
                        slot  : {
                            row,
                            column    : detail.column,
                            alternate : true,
                        }
                    }
                )}
            />
        {/each}
    </div>
</div>

<script>
import followups from "utilities/followups.js";

import String from "components/attack-string.svelte";

import { deck } from "stores/deck.js";
import { service } from "state/state.js";

$: primary = $deck.primaries;
$: alternate = $deck.alternates;

</script>

<style>
    .overview {
        --attack-tile-height: 6rem;
        --attack-tile-width: 6rem;

        display: grid;

        grid-template: 
            ".         . .         " 4rem
            "primaries . alternates" 1fr
            ".         . .         " 4rem
            / 3fr 1fr 3fr;

        height: 100%;
        width: 100%;
        overflow: hidden;
    }
    
    .area {
        display: flex;
        flex-flow: column nowrap;
        justify-content: center;
        align-items: center;
    }

    .primaries {
        grid-area: primaries;
    }

    .alternates {
        grid-area: alternates;
    }
</style>

