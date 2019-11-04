import { writable, readable, derived } from "svelte/store";
import quadrants from "utilities/quadrants.js";

const combo = (length) => quadrants.map((stance) => ({
    stance,
    attacks : Array(length).fill(false),
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

    const names = flat.map((attack) => attack.name).filter(Boolean);

    set(names);
});

const set = ({ attack }, { row, column }) => {
    primaries.update((data) => {
        const { attacks } = data[row];

        attacks[column] = attack;

        return data;
    });
};


window.equipped = equipped;

export {
    barehands,

    primaries,
    alternates,
    equipped,

    set,
};
