import { writable, get } from "svelte/store";

// Barehands is the default weapon.
const weapon = writable("barehands");

const equip = (armament) => weapon.set(armament);
const equipped = () => get(weapon);

export { equipped, equip };
export default weapon;
