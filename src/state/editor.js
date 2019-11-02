import { Machine, interpret, actions } from "xstate";
import tree from "xstate-component-tree";

import Overview from "components/deck-overview.svelte";
import Selection from "components/selection.svelte";

const { assign } = actions;

// Lol fuck you eslint
const machine = Machine;

const statechart = machine({
    initial : "overview",

    context : { pool : false },

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

// Should I even be doing this lmao.
export default (callback) => tree(service, callback);
