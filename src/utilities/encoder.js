import Hash from "hashids";

// Every attack.
import attacks from "data/all.js";

// Obfuscator: For encoding attacks into indexes.
// Clarifier: For decoding indexes back into attacks.
const obfuscator = new Map(attacks.map((attack, index) => ([ attack.name, index ])));
const clarifier  = new Map(attacks.map((attack, index) => ([ index, attack ])));

// Return 404 for empty attacks (attacks without names);
obfuscator.set(false, 404);

window.obfuscator = obfuscator;
window.clarifier = clarifier;

// Setup an instance of hashing.
const encoder = new Hash(
    "SALT_SORCERER",
    4,
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890"
);

/**
 *
 * @param {Array} deck - An Array of objects, each containing `quadrant`, `primary`, and `alternate`
 */
const deconstruct = (deck) => {
    /**
     * A flattened representation of every attack in the deck.
     */
    const flattened = deck.reduce((collector, { primary, alternate }) => {
        collector = collector.concat([ ...primary, ...alternate ]);

        return collector;
    }, []);

    const primitives = flattened.map((attack) =>
        (attack._meta.empty ? obfuscator.get(false) : obfuscator.get(attack.name)));

    return primitives;
};

const reconstruct = (flattened) => flattened.map((code) => {
    if(!clarifier.has(code)) {
        return {};
    }

    return clarifier.get(code);
});

/**
 *
 * @param {Array} attacks - A flat array of all attacks in the deck.
 *  [FR1, FR2, FR3, FRALT, FL1, FL2, FL3, FLALT, BL1, BL2, BL3, BLALT, BR1, BR2, BR3, BRALT]
 *
 * @returns An encoded Hex-esque string that can be later decoded.
 */
const encode = (deck) => {
    const encodable = deconstruct(deck);

    return encoder.encode(encodable);
};

/**
 *
 * @param {String} Hash - A Hash to convert to an array
 *
 * @return {Array} - An array of attack objects ready to hydrate the deck
 */
const decode = (hash) => {
    const constructable = encoder.decode(hash);

    return reconstruct(constructable);
};

export {
    encode,
    decode,
};
