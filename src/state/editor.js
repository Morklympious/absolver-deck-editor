import { Machine, interpret } from "xstate";
import tree from "xstate-component-tree";

import Layout from "components/layout.svelte";
import Selection from "components/selection.svelte";

// Lol fuck you eslint
const machine = Machine;

const statechart = machine({
    initial : "overview",

    on : {
        OVERVIEW : ".overview",
    },
    
    states : {
        overview : {
            on : {
                SELECTION : "selection",
            },
           
            meta : {
                component : Layout,
                props     : { one : 1 },
            },
        },

        selection : {
            on : {
                OVERVIEW : "overview",
            },

            meta : {
                component : Selection,
            },
        },
    },
});

const service = interpret(statechart);

service.start();

window.service = service;
window.tree = tree;

// Should I even be doing this lmao.
export default (callback) => tree(service, callback);
