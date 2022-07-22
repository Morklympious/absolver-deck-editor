import { writable } from "svelte/store";
import barehands from "data/barehands.json";
import sword from "data/sword.json";

const all = writable([ ...barehands, ...sword ]);

window._all = all;

export {
    barehands,
    all,
};
