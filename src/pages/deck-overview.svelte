<div class="overview">
    <div class="deck">
    {#each rows as { quadrant, primary, alternate }, row}
        <div class="group">
            <div class="combo" data-primary>
                <String 
                    {quadrant}
                    attacks={primary}
                    on:selection={({ detail }) =>    
                        state.send("SELECTING", { 
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
                    on:deletion={
                        ({ detail }) => {
                            state.send("DELETING", {
                                slot  : {
                                    row,
                                    column    : detail.column,
                                    alternate : false,
                                }
                            }
                        )}
                    }
                    on:hover={({ detail }) => set(detail)}
                />
            </div>

            <div class="combo" data-alternate>
                <String 
                    {quadrant}
                    attacks={alternate}
                    on:selection={({ detail }) =>    
                        state.send("SELECTING", { 
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
                    on:deletion={({ detail }) => {   
                        state.send("DELETING", {
                            slot  : {
                                row,
                                column    : detail.column,
                                alternate : true,
                            }
                        }
                    )}
                    }
                    on:hover={({ detail }) => set(detail)}
                />
            </div>
        </div>
    {/each}
    </div>
</div>

<script>
import followups from "utilities/followups.js";

import String from "components/attack-string.svelte";

import { deck, selected, primaries, alternates } from "stores/deck.js";
import { state } from "state/state.js";

$: rows = $deck;

const set = (attack) => selected.set(attack)
</script>

<style>
    .overview {
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
        display: var(--deck-overview-deck-display, flex);
        flex-flow: column;
        justify-content: center;
        height: 100%;
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

