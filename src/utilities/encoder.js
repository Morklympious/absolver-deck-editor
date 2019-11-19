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

const deconstruct = () => {};
const reconstruct = () => {};

/**
 *
 * @param {Array} attacks - A flat array of all attacks in the deck.
 *  [FR1, FR2, FR3, FRALT, FL1, FL2, FL3, FLALT, BL1, BL2, BL3, BLALT, BR1, BR2, BR3, BRALT]
 *
 * @returns An encoded Hex-esque string that can be later decoded.
 */
const encode = (attacks) => {
    const numerics = attacks.map(({ name, _meta }) => (_meta.empty ? obfuscator.get(false) : obfuscator.get(name)));

    return encoder.encode(numerics);
};

/**
 *
 * @param {Array} numbers - An array of numbers that will be converted back into attack data objects.
 *
 * @return {Array} - An array of attack objects ready to hydrate the deck
 */
const decode = (numbers) => encoder.decode(numbers);

export {
    encode,
    decode,
};
