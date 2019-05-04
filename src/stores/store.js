import { writable, readable } from 'svelte/store';

export const count = writable(0, (set) => {
    console.log("subscriber get!");
    return () => console.log("UNSUB", set);
});

export const increment = () => count.set(count + 1);