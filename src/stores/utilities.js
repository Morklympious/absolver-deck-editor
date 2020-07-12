import quadrants from "utilities/quadrants.js";
import { equipped } from "stores/weapon.js";

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

// Sets an attack at a location
const insert = (section, slot, attack) => {
    section.update((data) => {
        const attacks = data[slot.row];

        Object.assign(attacks[slot.column], attack);
        
        return data;
    });
    
    return;
};

// Remove an attack at a location
const remove = (section, slot, subsequent = false) => {
    section.update((data) => {
        let attacks = data[slot.row];

        // !subsequent means we're not deleting all the stuff that comes after the target,
        if(!subsequent) {
            const attack = attacks[slot.column];
            // Overwrite the meta object EXCEPT for linked list references.
            const _meta = Object.assign(attack._meta, empty()._meta);

            // Create a new object that's empty but contains metadata
            attacks[slot.column] = Object.assign(Object.create(null), { _meta });

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

    insert,
    remove,
};
