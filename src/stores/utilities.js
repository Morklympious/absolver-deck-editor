import quadrants from "utilities/quadrants.js";

/**
 * Generate an empty deck slot object
 */
const empty = () => Object.assign(Object.create(null), {
    // Metadata for each cell to tell if it's empty, as well as
    // offer convenient pointers to its neighbors
    _meta : {
        empty  : true,
        begins : false,
        ends   : false,
    },
});

/**
 * A factory function to generate a combo of length `length`
 * that comes complete with a default structure. This is used to generate
 * the primary strings (`combo(3)`) and alternate strings (`combo(1)`)
 * @param {Number} length
 */
const combo = (length) => {
    const results = [];

    quadrants.forEach(() => {
        let attacks = Array.from(Array(length), empty);

        attacks = attacks.map(empty);
        
        attacks.forEach((attack, i) => {
            const next = attacks[i + 1] || false;
            const previous = attacks[i - 1] || false;

            const { _meta } = attack;

            _meta.next = next;
            _meta.previous = previous;
        });

        results.push(attacks);
    });

    return results;
};

/**
 * A function that takes a combo and runs through its attacks and
 * sets its _meta properties based contextually on the attacks that come before/after it.
 *
 * @param {Array} chain - An array of attacks to be walked and modified in-place
 */
const configure = (quadrant, attacks) => {
    attacks.forEach((attack) => {
        const { _meta } = attack;
        const { previous } = _meta;

        // This attack isn't empty if it has a name.
        _meta.empty = !attack.name;

        // If there's no previous move
        if(!_meta.previous) {
            // The current cell's beginning is defaulted to the quadrant it belongs to
            _meta.begins = quadrant;

            // The ending is either the quadrant, or if we have attack data, the ending for the attack.
            _meta.ends = (_meta.empty ? quadrant : attack.stance[_meta.begins]);
            
            return;
        }

        /**
         * This attack begins where the previous one left off. But if there
         * is no previous attack, it's defaulted to the quadrant in the combo
         * this attack belongs to.
         */
        _meta.begins = previous._meta.empty ? quadrant : previous._meta.ends;
        _meta.ends = _meta.empty ? quadrant : attack.stance[_meta.begins];

        return;
    });
    
    return;
};

// Sets an attack at a location
const insert = (section, slot, attack) => {
    section.update((data) => {
        const attacks = data[slot.row];

        Object.assign(attacks[slot.column], attack);
        
        return data;
    });
    
    return;
};

// TODO: Clear a single cell, clear multiple extends that behavior
const remove = (section, slot, subsequent = false) => {
    section.update((data) => {
        let attacks = data[slot.row];

        // !subsequent means we're not deleting all the stuff that comes after the target,
        if(!subsequent) {
            const attack = row[slot.column];
            // Overwrite the meta object EXCEPT for linked list references.
            const _meta = Object.assign(attack._meta, empty()._meta);

            // Create a new object that's empty but contains metadata
            Object.assign(Object.create(null), { _meta });

            return data;
        }

        data[slot.row] = attacks.map((attack, index) => {
            if(index < slot.column) {
                return attack;
            }
            
            // Overwrite the meta object EXCEPT for linked list references.
            const _meta = Object.assign(attack._meta, empty()._meta);

            // Create a new object that's empty but contains metadata
            return Object.assign(Object.create(null), { _meta });
        });
        
        return data;
    });
};

export {
    combo,
    empty,
    configure,

    insert,
    remove,
};
