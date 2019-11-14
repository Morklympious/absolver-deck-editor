import { writable, derived } from "svelte/store";

import barehands from "data/barehands.js";
import quadrants from "utilities/quadrants.js";

const endings = new WeakMap();

const empty = () => Object.assign(Object.create(null), {
    // Metadata for each cell to tell if it's empty, as well as
    // offer convenient pointers to its neighbors
    _meta : {
        empty  : true,
        begins : false,
        ends   : false,
    },
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
        
        attacks.forEach((attack, i) => {
            const next = attacks[i + 1] || false;
            const previous = attacks[i - 1] || false;

            const { _meta } = attack;

            _meta.next = next;
            _meta.previous = previous;
        });

        results.push({
            quadrant,
            attacks,
        });
    });

    return results;
};

// Data structures representing the entire state of primary
// strings and alternates in our deck.
const primaries = writable(combo(3));
const alternates = writable(combo(1));

const configure = (string) => {
    const { quadrant = "FRONT_RIGHT", attacks = [] } = string;

    attacks.forEach((attack) => {
        const { _meta } = attack;
        const { previous } = _meta;

        
        // This attack isn't empty if it has a name.
        _meta.empty = !attack.name;

        // If there's no previous move
        if(!_meta.previous) {
            // The current cell's beginning is defaulted to the quadrant it belongs to
            _meta.begins = quadrant;

            // The ending is either the quadrant, or if we have attack data, the ending for the attack.
            _meta.ends = (_meta.empty ? quadrant : attack.stance[_meta.begins]);
            
            return;
        }

        /**
         * This attack begins where the previous one left off. But if there
         * is no previous attack, it's defaulted to the quadrant in the string
         * this attack belongs to.
         */
        _meta.begins = previous._meta.empty ? quadrant : previous._meta.ends;
        _meta.ends = _meta.empty ? quadrant : attack.stance[_meta.begins];

        return;
    });
    
    return;
};

// Derive a deck object that keeps the most up to date deck attack / stance flow information
const deck = derived([ primaries, alternates ], ([ _p, _a ], set) => {
    // Use side effects to configure both the primary section attacks and the
    // Alternate attacks. This is run every time primaries or alternates is updated.
    _p.forEach(configure);
    _a.forEach(configure);
    
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

        Object.assign(attacks[slot.column], attack);
        
        return data;
    });
};

const clear = (slot) => {
    primaries.update((data) => {
        const row = data[slot.row];

        row.attacks = row.attacks.map((attack, index) => {
            if(index < slot.column) {
                return attack;
            }
            
            // Overwrite the meta object EXCEPT for linked list references.
            const _meta = Object.assign(attack._meta, empty()._meta);

            // Create a new object that's empty but contains metadata
            return Object.assign(Object.create(null), { _meta });
        });
        
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
    clear,
};
