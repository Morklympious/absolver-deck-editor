import { writable, derived } from "svelte/store";

import barehands from "data/barehands.js";

import { empty, combo, configure, insert, remove } from "stores/utilities.js";
import quadrants from "utilities/quadrants.js";
import { encode, decode } from "utilities/hash.js";

window._encode = encode;
window._decode = decode;

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
    
    const map = quadrants.map((quadrant, index) => ({
        primary   : _p[index],
        alternate : _a[index],
    }));

    set(map);
});

export {
    barehands,

    primaries,
    alternates,

    deck,
};
