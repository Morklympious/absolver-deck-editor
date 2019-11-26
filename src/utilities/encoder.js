import Hash from "hashids";
import { primaries, alternates } from "stores/deck.js";

// Every attack.
import { all as attacks } from "data/all.js";

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
        // Grab every row and concatenate it together
        collector = collector.concat([ ...primary, ...alternate ]);

        return collector;
    }, []);

    const primitives = flattened.map((attack) =>
        (attack._meta.empty ? obfuscator.get(false) : obfuscator.get(attack.name)));

    return primitives;
};

const reconstruct = (flattened) => {
    const [
        FR1, FR2, FR3, FRA,
        FL1, FL2, FL3, FLA,
        BL1, BL2, BL3, BLA,
        BR1, BR2, BR3, BRA,
    ] = flattened.map((code, index) => {
        if(!clarifier.has(code)) {
            return {};
        }

        return clarifier.get(code);
    });

    const p = [
        [ FR1, FR2, FR3 ],
        [ FL1, FL2, FL3 ],
        [ BL1, BL2, BL3 ],
        [ BR1, BR2, BR3 ],
    ];

    const a = [
        [ FRA ],
        [ FLA ],
        [ BLA ],
        [ BRA ],
    ];

    const ip = p.map((atks, row) => atks.map((attack, column) => ({
        attack,
        slot : {
            row,
            column,
        },
        target : primaries,
    })));

    const ia = a.map((atks, row) => atks.map((attack, column) => ({
        attack,
        slot : {
            row,
            column,
        },
        target : alternates,
    })));

    return { primaries : ip, alternates : ia };
};

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
