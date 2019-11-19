import Hash from "hashids";

// Every attack.
import attacks from "data/all.js";

// Obfuscator: For encoding attacks into indexes.
// Clarifier: For decoding indexes back into attacks.
const obfuscator = new Map(attacks.map((attack, index) => ([ attack.name, index ])));
const clarifier  = new Map(attacks.map((attack, index) => ([ index, attack ])));

window.obfuscator = obfuscator;
window.clarifier = clarifier;

// Setup an instance of hashing.
const encoder = new Hash(
    "SALT_SORCERER",
    4,
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890"
);

const encode = (deck) => encoder.encode(deck);
const decode = (numbers) => encoder.decode(numbers);

export {
    encode,
    decode,
};
