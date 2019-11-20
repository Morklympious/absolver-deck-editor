import { insert } from "stores/utilities.js";
import { primaries, alternates } from "stores/deck.js";
/**
 *
 * @param {Object} - Object containing `{ primaries: ..., alternates: ...}`
 * each key is an array of arrays containing `{ attack: ..., slot: ..., target: ... }`
 */
const hydrate = (data) => {
    const { primaries : _p, alternates : _a } = data;

    primaries.update((data) => {
        _p.forEach((row) => {
            row.forEach(({ attack, slot }) => {
                insert(primaries, slot, attack);
            });
        });

        return data;
    });

    alternates.update((data) => {
        _a.forEach((row) => {
            row.forEach(({ attack, slot }) => {
                insert(alternates, slot, attack);
            });
        });
        
        return data;
    });
};

window._hydrate = hydrate;

export default hydrate;
