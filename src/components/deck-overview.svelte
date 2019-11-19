<div class="overview">
    <div class="deck">
    {#each rows as { quadrant, primary, alternate }, row}
        <div class="group">
            <div class="combo" data-primary>
                <String 
                    {quadrant}
                    attacks={primary.attacks}
                    on:selection={({ detail }) =>    
                        service.send("SELECTING", { 
                            string   : quadrant,
                            quadrant : detail.quadrant,
                            attack   : detail.attack,

                            combo : primary.attacks,
                            slot  : {
                                row,
                                column    : detail.column,
                                alternate : false,
                            }
                        }
                    )}
                />
            </div>

            <div class="combo" data-alternate>
                <String 
                    {quadrant}
                    attacks={alternate.attacks}
                    on:selection={({ detail }) =>    
                        service.send("SELECTING", { 
                            string   : quadrant,
                            quadrant : detail.quadrant,
                            attack   : detail.attack,

                            combo : alternate.attacks,
                            slot  : {
                                row,
                                column    : detail.column,
                                alternate : true,
                            }
                        }
                    )}
                />
            </div>
        </div>
    {/each}
    </div>
</div>

<script>
import followups from "utilities/followups.js";

import String from "components/attack-string.svelte";

import { deck } from "stores/deck.js";
import { service } from "state/state.js";

$: rows = $deck;
$: console.log(rows);
</script>

<style>
    .overview {
        --attack-tile-height: 8rem;
        --attack-tile-width: 8rem;

        display: grid;

        grid-template: 
            ".    .    .   " 4rem
            "deck deck deck" 1fr
            ".    .    .   " 4rem
            / 3fr 1fr 3fr;

        height: 100%;
        width: 100%;
        overflow: hidden;
    }

    /* This is an idea but maybe I'll just split the App based on mobile / desktop */
    /* @media (min-width: 700px) {
        .overview {
            grid-template: 
                "deck deck deck" 1fr
                / 1fr 1fr 1fr;
        }
    } */
    
    .deck {
        grid-area: deck;
        display: flex;
        flex-flow: column;
        justify-content: center;
    }

    .group {
        display: flex;
        justify-content: space-around;
    }
</style>

