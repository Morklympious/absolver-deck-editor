import { writable, derived } from "svelte/store";

import { combo } from "stores/utilities.js";

import quadrants from "utilities/quadrants.js";

import weapon, { equipped as eq } from "stores/weapon.js";

/**
 * A function that takes a combo and runs through its attacks and
 * sets its _meta properties based contextually on the attacks that come before/after it.
 *
 * @param {Array} chain - An array of attacks to be walked and modified in-place
 */
const configure = (quadrant, attacks) => {
    const armament = eq();

    attacks.forEach((attack) => {
        const { _meta } = attack;
        const { previous = false } = _meta;
        const { stance = false } = attack;
        const atkstance = stance[armament];

        // This attack isn't empty if it has a name.
        _meta.empty = !attack.name;

        // If there's no previous move
        if(!previous) {
            // The current cell's beginning is defaulted to the quadrant it belongs to
            _meta.begins = quadrant;

            // The ending is either the quadrant, or if we have attack data, the ending for the attack.
            _meta.ends = (_meta.empty ? quadrant : atkstance[_meta.begins]);
            
            return;
        }

        /**
         * This attack begins where the previous one left off. But if there
         * is no previous attack, it's defaulted to the quadrant in the combo
         * this attack belongs to.
         */
        _meta.begins = previous._meta.empty ? quadrant : previous._meta.ends;
        _meta.ends = _meta.empty ? quadrant : atkstance[_meta.begins];

        return;
    });
    
    return;
};

// Data structures representing the entire state of primary
// strings and alternates in our deck.
const primaries = writable(combo(3));
const alternates = writable(combo(1));

// Derive a deck object that keeps the most up to date deck attack / stance flow information
const deck = derived([ primaries, alternates ], ([ _p, _a ], set) => {
    // Use side effects to configure both the primary section attacks and the
    // Alternate attacks. This is run every time primaries or alternates is updated.
    // NOTE: This can probably be greatly optimized, but right now 8 arrays of < 4 elements each is... trivial.
    const map = quadrants.map((quadrant, current) => {
        const p = _p[current];
        const a = _a[current];

        configure(quadrant, p);
        configure(quadrant, a);

        return {
            quadrant,
            primary   : p,
            alternate : a,
        };
    });

    set(map);
});

const equipped = derived([ primaries, alternates ], ([ _p, _a ], set) => {
    const attacks = [ ..._p, ..._a ];
    const reduced = attacks.reduce((collector, current) => [ ...collector, ...current ], []);
    const names = reduced.map(({ name = "" }) => name);

    set(names);
});

const selected = writable(false);

// Glowing Stance icon
const followup = derived([ selected, weapon ], ([ _selected, _weapon ], set) => {
    const { _meta = false } = _selected;

    if(!_selected || !_meta) {
        return;
    }

    if(_meta.empty) {
        set(false);

        return;
    }

    const { stance } = _selected;
    const { begins } = _meta;

    set(stance[_weapon][begins]);
}, false);

const reset = () => {
    primaries.set(combo(3));
    alternates.set(combo(1));
};

export {
    primaries,
    alternates,
    equipped,

    selected,
    followup,
    
    deck,
    reset,
};
