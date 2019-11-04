import { writable, readable, derived } from "svelte/store";
import quadrants from "utilities/quadrants.js";

const STANCE_OBJECT = quadrants.map((stance) => ({
    stance,
    attacks : [ false, false, false ],
}));

// Straightup barehands data for (soon-to-be) every barehands attack in the game
const barehands = readable(false, (set) => set(baremoves));

// Data structures representing the entire state of primary
// strings and alternates in our deck.
const primaries = writable(STANCE_OBJECT);
const alternates = writable(STANCE_OBJECT);

// A derived that will tell us which moves are already equipped,
// allowing us to filter out moves during move selection.
const equipped = derived([ primaries, alternates ], ([ _primaries, _alternates ], set) => {
    const pool = _primaries.values().concat(_alternates.values());
    const names = pool.map((attack) => attack.name);

    set(names);
});

const set = ({ attack, ending }, { row, column }) => {
    attack.ending = ending;

    console.log("tacked on an ending", attack.ending);
    primaries.update((data) => {
        const { attacks } = data[row];

        attacks[column] = attack;

        console.log(data);

        return data;
    });
};

export {
    barehands,

    primaries,
    alternates,
    equipped,

    set,
};
