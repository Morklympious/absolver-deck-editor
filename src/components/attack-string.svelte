<div class="string">
    <Stance {quadrant} first />
    {#each attacks as attack, index}
        <Attack 
            {attack}
            deletable={true}
            target="{target === index}"
            origin="{originify(attack)}"
            on:selection={({ detail : atk }) => {
                bubble("selection", {
                    column : index,

                    attack,
                    quadrant : originify(atk),
                });
            }}
            on:deletion={() => bubble("deletion", { column : index })}
            on:hover={({ detail : atk }) => bubble("hover", atk)}
        />
        <Stance 
            empty={attack._meta.empty}
            quadrant={empty(attack) ? quadrant : attack.stance[$weapon][beginning(attack)]} 
        />
    {/each}
</div>

<script>
    import { createEventDispatcher } from "svelte";
    import weapon from "stores/weapon.js";

    import Attack from "components/attack-tile.svelte";
    import Stance from "components/icons/stance-icon.svelte";

    const bubble = createEventDispatcher();

    export let attacks = [];
    export let quadrant = "FRONT_RIGHT";
    export let target;

    // Given a cell (a tile that can hold an attack),
   // calculate what quadrant it belongs to.
    const originify = (attack) => {
        // Is it empty? is anything before it?
        const { _meta } = attack;
        const { previous } = _meta;

        // If there's nothing before the slot we chose, we take the quadrant we were passed
        if(!previous) {
            return quadrant;
        }

        // If there is a previous, we care about generating followups from that
       // previous attack's ending stance.
        return previous._meta.ends;
    };

    const empty = (attack) => attack._meta.empty;
    const beginning = (attack) => attack._meta.begins;
</script>
            
<style>
    .string {
        display: flex;
        justify-content: center;
        align-items: center;

        margin: 1rem 0;
    }
</style>
