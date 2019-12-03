<div class="overview">
    <div class="deck">
    {#each rows as { quadrant, primary, alternate }, row}
        <div class="group">
            <div class="combo" data-primary>
                <String 
                    {quadrant}
                    attacks={primary}
                    on:selection={({ detail }) =>    
                        service.send("SELECTING", { 
                            string   : quadrant,
                            quadrant : detail.quadrant,
                            attack   : detail.attack,

                            combo : primary,
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
                    attacks={alternate}
                    on:selection={({ detail }) =>    
                        service.send("SELECTING", { 
                            string   : quadrant,
                            quadrant : detail.quadrant,
                            attack   : detail.attack,

                            combo : alternate,
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

    <WeaponToggle />
</div>

<script>
import followups from "utilities/followups.js";

import String from "components/attack-string.svelte";
import WeaponToggle from "components/weapon-toggle.svelte";

import { deck } from "stores/deck.js";
import { service } from "state/state.js";

$: rows = $deck;
</script>

<style>
    .overview {
        --attack-tile-height: 6.5rem;
        --attack-tile-width: 6.5rem;

        display: grid;

        grid-template: 
            ". " 4rem
            "deck" 1fr
            "." 4rem
            / 1fr;

        height: 100%;
        width: 100%;
    }

    /* @media (min-width: 700px) {

        .overview {
            --attack-tile-height: 15rem;
            --attack-tile-width: 15rem;
            --stance-icon-dimension : 4rem;

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
        flex-flow: row wrap;
    }

    .combo {
        flex: 1
    }

    .combo[data-primary] {
        flex: 2;
    }

    .combo[data-alternate] {
        align-self: flex-end;
    }
</style>

