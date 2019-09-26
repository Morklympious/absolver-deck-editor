import { readable, derived } from "svelte/store";
import baremoves from "../data/barehands.js";

const FRONT = "F";
const BACK  = "B";

const equal = (a, b) => a === b;

const barehands = readable(false, (set) => set(baremoves));

// All attacks that begin in front stance
const front = derived(barehands, (attacks) =>
    attacks.filter(({ stance }) => equal(stance.begins, FRONT))
);

// All attacks that begin in back stance.
const back = derived(barehands, (attacks) =>
    attacks.filter(({ stance }) => equal(stance.begins, BACK))
);

export { barehands, front, back };
