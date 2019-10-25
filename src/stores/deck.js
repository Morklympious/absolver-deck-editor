import { writable, derived } from "svelte/store";
import quadrants from "utilities/quadrants.js";

const STANCE_MAP = quadrants.map(({ face, look }) => [ `${face}_${look}`, []]);

// Straightup barehands data for (soon-to-be) every barehands attack in the game
const barehands = readable(false, (set) => set(baremoves));

// Data structures representing the entire state of primary
// strings and alternates in our deck.
const primaries = writable(new Map(STANCE_MAP));
const alternates = writable(new Map(STANCE_MAP));

// A derived that will tell us which moves are already equipped,
// allowing us to filter out moves during move selection.
const equipped = derived([ primaries, alternates ], ([ _primaries, _alternates ], set) => {
    const pool = _primaries.values().concat(_alternates.values());
    const names = pool.map((attack) => attack.name);

    set(names);
});

const pool = writable(false);

export {
    barehands,

    primaries,
    alternates,
    equipped,
    pool,
};
