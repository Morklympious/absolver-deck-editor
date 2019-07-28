import { readable } from "svelte/store";
import baremoves from "../data/barehands.js";

const barehands = readable(false, (set) => set(baremoves));

export { barehands };
