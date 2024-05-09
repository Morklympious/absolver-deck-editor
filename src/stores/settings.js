import { writable, derived } from "svelte/store";

export const colorEnabled = writable(true);

//note to self: referenced in components/attack-tile.svelte and components/menu/side-drawer.svelte