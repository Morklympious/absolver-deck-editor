import barehands from "../data/barehands.js";
import quadrants from "utilities/quadrants.js";

// Cache for memoizing input to followups
const cache = new Map();

/**
 * Given some arbitrary quadrant data, runs through the move pool
 * and determines which moves will take you from your passed in position
 * to each of the known stance quadrants.
 *
 * @param {Object} source - The quadrant you want to move from
 * @param {String} source.face - The way you're facing: either "FRONT" or "BACK"
 * @param {String} source.look - The way you're looking: either "LEFT" or "RIGHT"
 *
 * @returns {Object} A Svelte 3 derived store that contains a Map of move options
 */
const followups = (source) => {
    if(!source) {
        return false;
    }

    const key = `${source.face}_${source.look}`;

    if(cache.has(key)) {
        return cache.get(key);
    }

    const map = new Map();

    // For each quadrant, find out the moves
    // That will take you from the source quadrant to
    // the target quadrant (e.g. FRONT_RIGHT to BACK_LEFT)
    quadrants.forEach((quadrant) => {
        const data = barehands.filter(({ stance }) =>
            stance.begins === source.face &&
            stance.ends === quadrant.face &&
            stance.pivot === !(quadrant.look === source.look));

        map.set(`${quadrant.face}_${quadrant.look}`, data);
    });
    

    // Set this key for the cache so we can save off this stuff for later.
    cache.set(key, map);

    return map;
};

window.followups = followups;

export default followups;
