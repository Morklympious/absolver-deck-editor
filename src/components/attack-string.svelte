<div class="string">
    <Stance {quadrant} />
    {#each attacks as attack, index}
        <Attack 
            {attack} 
            on:selection={({ detail : attack }) => {
                bubble("selection", { 
                    column : index,

                    attack,
                    quadrant : generate(attack, index),
                })
            }}
        />
        <Stance quadrant={attack._empty ? "UNKNOWN" : attack.stance[attack._begins]} />
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

    const generate = (attack, index) => {
        // Is it empty? is anything before it?
        const { _previous } = attack;

        // If there's nothing before the slot we chose, we take the quadrant we were passed
        if(!_previous) {
            return quadrant;
        }

        // If there is a previous, we care about generating followups from that 
        // previous attack's ending stance.
        return _previous._ends;
    }
</script>
            
<style>
    .string {
        display: flex;
        justify-content: center;
        align-items: center;

        margin: 1rem 0;
    }
</style>
