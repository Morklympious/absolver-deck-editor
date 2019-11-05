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

</script>
            
<style>
    .string {
        display: flex;
        justify-content: center;
        align-items: center;
    }
</style>