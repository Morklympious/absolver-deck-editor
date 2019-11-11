<div class="overview">
    <div class="primaries">
        {#each primary as { attacks, quadrant }, row}
            <String 
                {quadrant}
                {attacks}
                on:selection={({ detail }) =>    
                    service.send("SELECTING", { 
                        quadrant : detail.quadrant,
                        attack   : detail.attack,

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

    <div class="alternates">
        {#each alternate as { attacks, quadrant }, row}
            <String 
                {quadrant}
                {attacks}
                on:selection={({ detail }) =>    
                    service.send("SELECTING", { 
                        quadrant,

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

