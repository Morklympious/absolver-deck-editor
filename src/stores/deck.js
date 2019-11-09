import { writable, derived } from "svelte/store";

import baremoves from "data/barehands.js";
import quadrants from "utilities/quadrants.js";

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

            const next = attacks[i + 1];
            const previous = attacks[i - 1];

            attack._begins = quadrant;
            attack._ends = quadrant;

            attack._next = next;
            attack._previous = previous;

            attacks[i] = attack;
        }

        results.push({
            quadrant,
            attacks,
        });
    });

    return results;
};

window.combo = combo;
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

window.bare = barehands;

// Data structures representing the entire state of primary
// strings and alternates in our deck.
const primaries = writable(combo(3));
const alternates = writable(combo(1));


const deck = derived([ primaries, alternates ], ([ _p, _a ], set) => {
    _p.forEach(({ quadrant, attacks }) => {
        attacks.forEach((attack) => {
            if(attack.name) {
                attack._empty = false;
            }

            const { _previous : prev } = attack;
            
            if(!prev) {
                attack._begins = quadrant;
                attack._ends = (attack._empty ? quadrant : attack.stance[attack._begins]);

                return;
            }

            const _begins =  prev._empty ? quadrant : prev._ends;
            const _ends = attack._empty ? quadrant : attack.stance[_begins];
            
            console.log({ _begins, _ends });

            /**
             *  If this is the first attack, it's constrained by being
             *  a specific starting quadrant. Otherwise? we're using the
             *  ending location of the last move we slotted.
             * */
             attack._begins = _begins;
             attack._ends = _ends;

            return;
        });
    });

    set({
        primaries  : _p,
        alternates : _a,
    });
});

window.deck = deck;

deck.subscribe((a) => console.log(a));

const update = (data, slot, { attack }) => {
    const { attacks } = data[slot.row];

    Object.assign(attacks[slot.column], attack);
    
    return data;
};

// This is a bit heavy, but this sets an attack at a location,
// and then updates the next tile in sequence to have proper meta data.
const set = (slot, { attack, meta }) => {
    if(slot.alternate) {
        alternates.update((data) => update(data, slot, { attack, meta }));
        
        return;
    }

    primaries.update((data) => update(data, slot, { attack, meta }));
};

export {
    barehands,

    primaries,
    alternates,

    set,
};
