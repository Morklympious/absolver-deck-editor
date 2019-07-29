"use strict";

const path = require("path");

const alias = (aliases = {}) => {
    const keys = Object.keys(aliases);

    if(!keys.length) {
        return {
            resolveId : () => null,
        };
    }

    // Creates a giant "this|or|that|match"
    // The regex means = "Starts with ${key} and is delimited by a word delimiter."
    const lookup = new RegExp(keys.map((key) => `^${key}\\b`).join("|"));

    return {
        name : "rollup-plugin-aliases",

        resolveId : (source) => {
            // See if the source here is in the lookup regex.
            // If it is, it means we have an alias to replace.
            const match = source.match(lookup);

            if(!match) {
                return null;
            }

            
            const [ key ] = match;
            const resolved = path.normalize(source.replace(key, aliases[key]));

            return resolved;
        }
    };
};

export default alias;
