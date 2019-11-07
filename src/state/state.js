import { Machine, interpret, actions } from "xstate";
import xct from "xstate-component-tree";

import { set } from "stores/deck.js";
import followups from "utilities/followups.js";

import Overview from "components/deck-overview.svelte";
import Selection from "components/attack-selection.svelte";

const { assign } = actions;

// Lol fuck you eslint
const machine = Machine;

const statechart = machine({
    initial : "overview",

    context : {
        pool : [],
        slot : {
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
                SELECTED : {
                    target : "overview",

                    actions : [
                        // Set the attack
                        ({ slot }, { attack, ends }) =>
                            set(slot, {
                                attack,
                                meta      : { ends },
                                alternate : slot.alternate,
                            }),
                    ],
                },

                BACK : "overview",
            },

            entry : [
                // Populate the pool + target in the context object when we enter.
                assign({
                    pool : (context, { origin, alternate }) =>
                        followups(origin, alternate ? { exclude : origin } : {}),

                    slot      : (context, { slot }) => slot,
                    alternate : (context, { alternate }) => alternate,
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
