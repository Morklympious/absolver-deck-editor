import { writable, derived } from "svelte/store";

import baremoves from "data/barehands.js";
import quadrants from "utilities/quadrants.js";

const endings = new WeakMap();

const empty = () => Object.assign(Object.create(null), {
    _empty : true,
});

/**
 * A factory function to generate a combo of length `length`
 * that comes complete with a default structure.
 *
 * @param {Number} length
 */
const combo = (length) => {
    const results = [];

    quadrants.forEach((quadrant) => {
        let attacks = Array(length).fill(0);

        attacks = attacks.map(empty);
        
        for(let i = 0; i < attacks.length; i++) {
            const attack = attacks[i];

            const next = attacks[i + 1] || false;
            const previous = attacks[i - 1] || false;

            attack._next = next;
            attack._previous = previous;
        }

        results.push({
            quadrant,
            attacks,
        });
    });

    return results;
};

// Straightup barehands data for (soon-to-be) every barehands attack in the game
const barehands = baremoves.map((attack) => {
    const begin = (look) => `${attack.stance.begins}_${look}`;
    const end = (look) => `${attack.stance.ends}_${look}`;

    attack.stance = {
        [begin("LEFT")]  : end(attack.stance.pivot ? "RIGHT" : "LEFT"),
        [begin("RIGHT")] : end(attack.stance.pivot ? "LEFT" : "RIGHT"),
    };

    return attack;
});

// Data structures representing the entire state of primary
// strings and alternates in our deck.
const primaries = writable(combo(3));
const alternates = writable(combo(1));

const deck = derived([ primaries, alternates ], ([ _p, _a ], set) => {
    const m = new Map();

    _p.forEach(({ quadrant, attacks }) => {
        attacks.forEach((attack) => {
            // This attack isn't empty if it has a name.
            attack._empty = !attack.name;

            const { _previous : prev } = attack;
            
            // If there's no previous move
            if(!prev) {
                // The current cell's beginning is defaulted to the quadrant it belongs to
                attack._begins = quadrant;

                // The ending is either the quadrant, or if we have attack data, the ending for the attack.
                attack._ends = (attack._empty ? quadrant : attack.stance[attack._begins]);
                
                return;
            }

            /**
             * This attack begins where the previous one left off. But if there
             * is no previous attack, it's defaulted to the quadrant in the string
             * this attack belongs to.
             */
            attack._begins = prev._empty ? quadrant : prev._ends;
            attack._ends = attack._empty ? quadrant : attack.stance[attack._begins];

            return;
        });
    });

    set({
        primaries  : _p,
        alternates : _a,
    });
});

// This is a bit heavy, but this sets an attack at a location,
// and then updates the next tile in sequence to have proper meta data.
const set = (slot, attack) => {
    if(slot.alternate) {
        alternates.update((data) => {
            const { attacks } = data[slot.row];

            Object.assign(attacks[slot.column], attack);
            
            return data;
        });
        
        return;
    }

    primaries.update((data) => {
        const { attacks } = data[slot.row];

        // TODO: MERGE _METADATA
        // check what stats are currently here
        // and then see if the attack fits.
        Object.assign(attacks[slot.column], attack);
        
        return data;
    });
};

window.endings = endings;

export {
    barehands,

    primaries,
    alternates,
    deck,

    set,
};
