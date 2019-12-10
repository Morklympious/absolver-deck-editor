import { interpret } from "xstate";
import { writable } from "svelte/store";

const matches = (service, lookup) => {
    const selector = lookup.split(".");

    let pointer = service.state.value;
    
    return selector.every((key) => {
        if(typeof pointer === "string") {
            return key === pointer;
        }

        if(!pointer[key]) {
            return false;
        }

        pointer = pointer[key];

        return true;
    });
};

const statechart = (machine, options) => {
    // Create a statechart service that interprets
    // a passed in machine.
    const service = interpret(machine, options);

    const matching = matches.bind(null, service);
    
    const store = writable({
        __proto__ : null,

        value   : {},
        context : {},
        event   : false,
        matches : matching,
    });

    const update = ({ value, event, context }) => {
        store.update((data) => {
            data.value = value;
            data.event = event;
            data.context = context;

            return data;
        });
    };

    return {
        service,
        subscribe : store.subscribe,
        matches   : matching,
        
        start() {
            service.onTransition(update);
            service.start();

            return service;
        },

        stop() {
            service.stop();
        },

        send(...args) {
            service.send(...args);
        },
    };
};

export default statechart;
