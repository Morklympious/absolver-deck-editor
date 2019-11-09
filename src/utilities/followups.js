import barehands from "data/barehands.js";
import quadrants from "utilities/quadrants.js";

// Cache for memoizing input to followups
const cache = new Map();

/**
 * Given some arbitrary quadrant data, runs through the move pool
 * and determines which moves will take you from your passed in position
 * to each of the known stance quadrants.
 *
 * @param {Object} source - The quadrant you want to move from e.g. "FRONT_LEFT"
 *
 * @returns {Object} A Map of move options that can originate from the source
 */
const followups = (source, options = false) => {
    const attacks = barehands;

    if(!source) {
        return false;
    }

    const key = source;

    // Should we exclude any quadrants?
    const { exclude = [] } = options;

    // Return an existing pool if we've already done this work
    if(cache.has(key)) {
        return cache.get(key);
    }

    const pool = [];

    // For each quadrant, find out the moves
    // That will take you from the source quadrant to
    // the target quadrant (e.g. FRONT_RIGHT to BACK_LEFT)
    quadrants.forEach((quadrant) => {
        // If the current quadrant is blacklisted, don't bother.
        if(exclude.includes(quadrant)) {
            return;
        }

        let data = attacks.filter((attack) => {
            const { stance } = attack;
            const keys = Object.keys(attack.stance);

           /**
            * The stance object has to have a key that matches our `source`.
            * Additionally, the VALUE of that key (attack.stance[key] e.g. FRONT_RIGHT) needs
            * to match the quadrant we're currently iterating over.
           */
            return keys.includes(source) && stance[source] === quadrant;
        });

        // Giveth me an object with metadata and attacks, brethren
        pool.push({
            stance  : quadrant,
            attacks : data,
        });
    });
    

    // Set this key for the cache so we can save off this stuff for later.
    cache.set(key, pool);

    return pool;
};

window.followups = followups;

export default followups;
