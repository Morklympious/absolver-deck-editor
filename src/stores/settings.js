import { writable, derived } from "svelte/store";

export const enableColors = writable(true);
export const enableTypeLabel = writable(true);

//note to self: referenced in components/attack-tile.svelte and components/menu/side-drawer.svelte