import { Machine, interpret, actions } from "xstate";
import xct from "xstate-component-tree";

import Overview from "components/deck-overview.svelte";
import Selection from "components/selection.svelte";

const { assign } = actions;

// Lol fuck you eslint
const machine = Machine;

const statechart = machine({
    initial : "overview",

    context : {
        pool : new Map(),
    },

    on : {
        OVERVIEW : ".overview",
    },
    
    states : {
        overview : {
            on : {
                SELECTION : "selection",
            },
           
            meta : {
                component : Overview,
            },
        },

        selection : {
            on : {
                OVERVIEW : "overview",
            },

            entry : [
                // Populate the pool in the context object when we enter.
                assign({
                    pool : (context, { pool }) => pool,
                }),
            ],

            exit : [
                // Empty the pool in context when we leave, because nothing will be using it.
                assign({
                    pool : ({ pool }) => {
                        pool.clear();

                        return pool;
                    },
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
