import { Machine } from "xstate";
import statechart from "./statechart.js";

const chart = statechart(new Machine({
    id      : "deck-editor",
    initial : "idle",
    
    on : {

    },

    states : {
        idle : {},
    },
}));

export default chart;
