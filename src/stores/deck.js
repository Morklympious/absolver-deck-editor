import { writable, derived } from "svelte/store";

import barehands from "data/barehands.js";

import { empty, combo, configure } from "stores/utilities.js";

// Data structures representing the entire state of primary
// strings and alternates in our deck.
const primaries = writable(combo(3));
const alternates = writable(combo(1));

// Derive a deck object that keeps the most up to date deck attack / stance flow information
const deck = derived([ primaries, alternates ], ([ _p, _a ], set) => {
    // Use side effects to configure both the primary section attacks and the
    // Alternate attacks. This is run every time primaries or alternates is updated.
    // NOTE: This can probably be greatly optimized, but right now 8 arrays of < 4 elements each is... trivial.
    _p.forEach(configure);
    _a.forEach(configure);
    
    set({
        primaries  : _p,
        alternates : _a,
    });
});

// Sets an attack at a location
const set = (slot, attack) => {
    const { alternate } = slot;
    const target = alternate ? alternates : primaries;
    
    target.update((data) => {
        const { attacks } = data[slot.row];

        Object.assign(attacks[slot.column], attack);
        
        return data;
    });
    
    return;
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

export {
    barehands,

    deck,

    set,
    clear,
};
