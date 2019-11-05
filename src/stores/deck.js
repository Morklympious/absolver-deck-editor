import { writable, readable, derived } from "svelte/store";
import quadrants from "utilities/quadrants.js";

const combo = (length) => quadrants.map((stance) => ({
    stance,
    attacks : Array(length)
        .fill(true)
        .map(() => ({
                meta : {
                    begins : stance,
                    ends   : "BACK_RIGHT",
                },
                attack : {},
            })),
}));

// Straightup barehands data for (soon-to-be) every barehands attack in the game
const barehands = readable(false, (set) => set(baremoves));

// Data structures representing the entire state of primary
// strings and alternates in our deck.
const primaries = writable(combo(3));
const alternates = writable(combo(1));

// A derived that will tell us which moves are already equipped,
// allowing us to filter out moves during move selection.
const equipped = derived([ primaries, alternates ], ([ _primaries, _alternates ], set) => {
    const p = _primaries.map(({ attacks }) => attacks);
    const a = _alternates.map(({ attacks }) => attacks);

    const pool = p.concat(a);
    const flat = pool.reduce((collector, string) => {
        collector = collector.concat(string);

        return collector;
    }, []);

    const names = flat
    .filter(({ attack }) => attack.name)
    .map(({ attack }) => attack.name);
    
    console.log(names);
    set(names);
});

const set = ({ row, column }, { attack, meta }) => {
    primaries.update((data) => {
        const { attacks } = data[row];

        let cell = attacks[column];
        let next = attacks[column + 1];

        // Place the attack and associated meta in the slot.
        // Using assign here because the first attack is pre-seeded with
        // a meta.begins value.
        attacks[column] = {
            attack : Object.assign(cell.attack, attack),
            meta   : Object.assign(cell.meta, meta),
        };

        // If there's a next attack tile in the sequence (empty or not)
        // We're going to seed its starting stance so when it gets clicked it knows from
        // which stance it can generate followups
        if(next) {
            next.meta = Object.assign(next.meta, { begins : meta.ends });
        }

        return data;
    });
};


window.equipped = equipped;
window.primaries = primaries;

equipped.subscribe((data) => console.log("[Equipped]", data));

export {
    barehands,

    primaries,
    alternates,
    equipped,

    set,
};
