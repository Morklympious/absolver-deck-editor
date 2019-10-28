import { Machine, interpret } from "xstate";
import tree from "xstate-component-tree";

import Layout from "components/layout.svelte";

// Lol fuck you eslint
const machine = Machine;

const statechart = machine({
    initial : "idle",

    states : {
        idle : {
            meta : {
                component : Layout,
                props     : {},
            },
        },
    },
});

const service = interpret(statechart);

// Should I even be doing this lmao.
export default (callback) => tree(service, callback);
