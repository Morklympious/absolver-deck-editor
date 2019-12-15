import { Machine, interpret, actions } from "xstate";
import xct from "xstate-component-tree";

import { alternates, primaries, reset } from "stores/deck.js";
import { equip } from "stores/weapon.js";
import { insert, remove } from "stores/utilities.js";

import storify from "utilities/chart-store.js";
import followups from "utilities/followups.js";
import compatible from "utilities/compatible.js";

import Overview from "pages/deck-overview.svelte";
import Selection from "pages/attack-selection.svelte";
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
        
        // TODO: Warn the user before resetting the deck, probably.
        EQUIP_SWORD : {
            actions : [
                () => reset(),
                () => equip("sword"),
            ],
        },

        EQUIP_BAREHANDS : {
            actions : [
                () => reset(),
                () => equip("barehands"),
            ],
        },
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
            initial : "idle",
            
            on : {
                OVERVIEW : "overview",

                NEW_TARGET : {
                    actions : [
                        assign({
                            slot   : ({ slot }, { column }) => Object.assign(slot, { column }),
                            target : (context, { attack }) => attack,
                            pool   : ({ slot }, { quadrant }) =>
                                followups(quadrant, slot.alternate ? { exclude : [ quadrant ] } : {}),
                        }),
                    ],
                },
                
                ATTACK_SELECTED : [
                    // Error: Invalid move selected for slot
                    // TODO: A state to handle slotting already equipped moves
                    // that might be elsewhere in the deck. old move gotta go, new move gotta be slotted.
                    {
                        target : ".override",

                        // If this attack isn't compatible in the place we're trying to slot it,
                        // we're gonna prompt the user to override the string.
                        cond : ({ target }, { attack }) => !compatible(target, attack),

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
                        actions : [
                            // We didn't trip any invalidators, so
                            // set the attack
                            ({ slot }, { attack }) => insert(
                                slot.alternate ? alternates : primaries,
                                slot,
                                attack
                            ),
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
                    target   : (context, { attack }) => attack,
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
                idle : {},

                override : {
                    on : {
                        // Accept the override, wipe the parts of the deck
                        // that are invalidated
                        ACCEPT : {
                            target  : "idle",
                            actions : [
                                ({ slot, attack }) => {
                                    // Remove everything at slot and forward.
                                    remove(
                                        slot.alternate ? alternates : primaries,
                                        slot,
                                        // Nuke everything after the target move, too
                                        true
                                    );
                                    
                                    // Insert the new move at slot.
                                    insert(
                                        slot.alternate ? alternates : primaries,
                                        slot,
                                        attack
                                    );
                                },
                            ],
                        },

                        // Reject the override, keep the string you were
                        // previously working with.
                        REJECT : {
                            target : "idle",
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

// This is a store that listens to transitions on the statechart,
// it also exposes the service it creates so xstate-component-tree can work.
const state = storify(statechart);

state.start();

const tree = (callback) => xct(state.service, callback);

export {
    tree,

    state,
};
