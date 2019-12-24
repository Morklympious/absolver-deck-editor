import { get } from "svelte/store";
import { equipped as deck } from "stores/deck.js";
/**
 *
 * @param {Object} target - A deck slot where `attack` will be placed.
 * @param {*} attack - An attack object that will be slotted into `target`
 */
const duplicate = (target, attack) => {
    const predicates = [
        // DUPE: the move you're trying to slot is already equipped
        get(deck).find((move) => move === attack.name),
    ];

    // If any predicate fails here, this configuration is incompatible
    return predicates.every(Boolean);
};

export default duplicate;
