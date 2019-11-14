<div class="string">
    <Stance {quadrant} />
    {#each attacks as attack, index}
        <Attack 
            {attack} 
            on:selection={({ detail : attack }) => {
                bubble("selection", { 
                    column : index,

                    attack,
                    quadrant : quadify(attack),
                })
            }}
        />
        <Stance 
            empty={attack._meta.empty}
            quadrant={attack._meta.empty ? quadrant : attack.stance[attack._meta.begins]} 
        />
    {/each}
</div>

<script>
    import { createEventDispatcher } from "svelte";
    import { service } from "state/state.js";

    import Attack from "components/attack.svelte";
    import Stance from "components/stance.svelte";

    const bubble = createEventDispatcher();

    export let attacks = [];
    export let quadrant = "FRONT_RIGHT";

    // Given a cell (a tile that can hold an attack), 
    // calculate what quadrant it belongs to.
    const quadify = (attack) => {
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
    }
</script>
            
<style>
    .string {
        --attack-doot: 5rem;
        display: flex;
        justify-content: center;
        align-items: center;

        margin: 1rem 0;
    }
</style>
