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

            entry : [
                assign({
                    pool : ({ pool }) => {
                        pool.clear();

                        return pool;
                    },
                }),
            ],
           
            meta : {
                component : Overview,
                props     : { one : 1 },
            },
        },

        selection : {
            on : {
                OVERVIEW : "overview",
            },

            entry : [
                assign({
                    pool : (context, { pool }) => pool,
                }),
            ],

            meta : {
                component : Selection,
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
