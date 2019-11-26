import { equipped } from "stores/weapon.js";

/**
 *
 * @param {Object} target - A deck slot where `attack` will be placed.
 * @param {*} attack - An attack object that will be slotted into `target`
 */
const compatible = (target, attack) => {
    const armament = equipped();

    const { next, previous } = target._meta;
    const { _meta : after } = next;
    const { _meta : before } = previous;

    const stance = attack.stance[armament];
    const endings = Object.values(stance);
    const beginnings = Object.keys(stance);

    const predicates = [
        // VALID: the move you're trying to slot ends where the next move begins
        // OR there's no move in the next slot.
        !next || after.empty || endings.includes(after.begins),

        // VALID: The move you're trying to slot already begins in the right stance where the previous move ends
        // OR there's no previous move.
        !previous || before.empty || beginnings.includes(before.ends),
    ];

    // If any predicate fails here, this configuration is incompatible
    return predicates.every(Boolean);
};

export default compatible;
