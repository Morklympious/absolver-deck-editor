import { Machine, interpret, actions } from "xstate";
import xct from "xstate-component-tree";

import { set, clear } from "stores/deck.js";
import followups from "utilities/followups.js";
import compatible from "utilities/compatible.js";

import Overview from "components/deck-overview.svelte";
import Selection from "components/attack-selection.svelte";
import Override from "components/override.svelte";


const { assign } = actions;

// Lol fuck you eslint
const machine = Machine;

const statechart = machine({
    id      : "editor",
    initial : "overview",

    context : {
        string   : [],
        quadrant : "",
        pool     : [],
        slot     : {
            row    : 0,
            column : 0,
        },
    },

    on : {
        OVERVIEW : ".overview",
    },
    
    states : {
        overview : {
            on : {
                SELECTING : "selecting",
            },
           
            meta : {
                component : Overview,
            },
        },

        selecting : {
            on : {
                OVERVIEW   : "overview",
                NEW_TARGET : {
                    actions : [
                        assign({
                            slot : ({ slot }, { column }) => Object.assign(slot, { column }),
                        }),
                    ],
                },
                SELECTED : [
                    // Error: Invalid move selected for slot
                    {
                        target : ".override",

                        // If this attack isn't compatible in the place we're trying to slot it,
                        // we're gonna prompt the user to override the string.
                        cond : ({ cell }, { attack }) => !compatible(cell, attack),

                        // Assign the attack into context because if the user chooses
                        // to overwrite the string we need to know what to put
                        // there instead.
                        actions : [
                            assign({
                                attack : (context, { attack }) => attack,
                            }),
                        ],
                    },
                    
                    // Success: valid move for selected slot
                    {
                        target  : "overview",
                        actions : [
                            // We didn't trip any invalidators, so
                            // set the attack
                            ({ slot }, { attack }) => set(slot, attack),
                        ],
                    },
                ],

                BACK : "overview",
            },

            entry : [
                // Populate the pool + target in the context object when we enter.
                assign({
                    pool : (context, { quadrant, slot }) =>
                        followups(quadrant, slot.alternate ? { exclude : [ quadrant ] } : {}),

                    slot     : (context, { slot }) => (slot),
                    cell     : (context, { attack }) => attack,
                    combo    : (context, { combo }) => combo,
                    quadrant : (context, { quadrant }) => quadrant,
                    string   : (context, { string }) => string,
                }),
            ],

            exit : [
                // Empty the pool in context when we leave, because nothing will be using it.
                assign({
                    pool : [],
                }),
            ],

            meta : {
                component : Selection,
                props     : (context) => context,
            },

            states : {
                override : {
                    on : {
                        // Accept the override, wipe the parts of the deck
                        // that are invalidated
                        ACCEPT : {
                            target  : "#editor.overview",
                            actions : [
                                ({ slot, attack }) => {
                                    clear(slot);
                                    set(slot, attack);
                                },
                            ],
                        },

                        // Reject the override, keep the string you were
                        // previously working with.
                        REJECT : {
                            target : "#editor.overview",
                        },
                    },

                    meta : {
                       component : Override,
                    },
                },
            },
        },
    },
});

const service = interpret(statechart);

service.start();

window.service = service;

const tree = (callback) => xct(service, callback);

export {
    service,
    tree,
};
