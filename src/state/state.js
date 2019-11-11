import { Machine, interpret, actions } from "xstate";
import xct from "xstate-component-tree";

import { set } from "stores/deck.js";
import followups from "utilities/followups.js";
import flows from "utilities/flows.js";

import Overview from "components/deck-overview.svelte";
import Selection from "components/attack-selection.svelte";

const { assign } = actions;

// Lol fuck you eslint
const machine = Machine;

const statechart = machine({
    initial : "overview",

    context : {
        combo : [],
        pool  : [],
        slot  : {
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
                OVERVIEW : "overview",
                SELECTED : [
                    // TODO : It's gonna be the wild west out here for a while,
                    // but basically I need to validate the setting of an attack.
                    // When placing a move in a slot I need to know:
                    /**
                     * 1) What comes before it? does the ending of that match any stance in the move I"m slotting
                     * 2) What comes after it? do the endings of the move I'm slotting match the beginnings of the next cell?
                     */
                    {
                        target : "overview",
                        cond   : ({ slot, cell }, { attack }) => {
                            // cell is the TARGET.
                            const next = cell._next;
                            const previous = cell._previous;
                            
                            const predicates = [
                                // VALID: the move you're trying to slot already has stance endings where the next move begins
                                // OR there's no move in the next slot.
                                Object.values(attack.stance).includes(next._begins) || next._empty,

                                // VALID: THe move you're trying to slot already has stance beginnings where the previous move ends
                                // OR there's no previous move.
                                Object.keys(attack.stance).includes(previous._ends) || !previous,
                            ];

                            if(!predicates.every(Boolean)) {
                                alert("holy fuck. don't.");
                                
                                return true;
                            }
                            
                            return false;
                        },
                        actions : [

                        ],
                    },
                    {
                        target  : "overview",
                        actions : [
                            // Set the attack
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

                    slot : (context, { slot }) => (slot),
                    cell : (context, { attack }) => attack,
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
