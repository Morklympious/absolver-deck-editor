<div class="string">
    <Stance {stance} />
    {#each attacks as { meta, attack }, index }
        <Attack 
            {attack} 
            on:selection={({ detail : attack }) => 
                update({
                    row,
                    column : index,
                    from   : meta.begins
                })
            }
        />
        <Stance stance={meta.ends} />
    {/each}
</div>

<script>

    import { createEventDispatcher } from "svelte";
    import { service } from "state/state.js";

    import Attack from "components/attack.svelte";
    import Stance from "components/stance.svelte";

    const bubble = createEventDispatcher();

    export let attacks = [];
    export let stance = "FRONT_RIGHT";
    export let row;


    const update = ({ row, column, from }) => {
    /**
     * We're now selecting a move, the pool of moves that will take us
     * to other stances is determined by the origin stance, and the 
     * slot we're targeting is a matrix coordinate.
     */
    service.send("SELECTING", { 
        pool : followups(from),
        slot : { row, column },
    })
}
</script>
            
<style>
    .string {
        display: flex;
        justify-content: center;
        align-items: center;
    }
</style>