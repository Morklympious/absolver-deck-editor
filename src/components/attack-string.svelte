<div class="string">
    <Stance {stance} />
    {#each attacks as { meta, attack }, index }
        <Attack 
            {attack} 
            on:selection={({ detail : attack }) => 
                bubble("selection", { 
                    column : index, 
                    from   : meta.begins,
                })
            }
        />
        <Stance stance={ending(attack, meta.begins)} />
    {/each}
</div>

<script>
    import { createEventDispatcher } from "svelte";
    import { service } from "state/state.js";

    import Attack from "components/attack.svelte";
    import Stance from "components/stance.svelte";

    const EMPTY = {
        meta   : {},
        attack : {},
    };
    const bubble = createEventDispatcher();

    export let attacks = [];
    export let stance = "FRONT_RIGHT";

    $: [ 
        first  = EMPTY, 
        second = EMPTY, 
        third  = EMPTY 
    ] = attacks;

    $: ending = (attack = false, begins = "") => {
        const { stance = false } = attack;
        
        if(!stance) {
            return "FRONT_RIGHT";
        }

        const m = {
            LEFT : "RIGHT",
            RIGHT : "LEFT",
        };

        const [ face, look ] = begins.split("_");
        const to = `${stance.ends}_${stance.pivot ? m[look] : look}`

        return to;
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
