<div class="string">
    <Stance {origin} />
    {#each attacks as attack, column (attack.name)}
        <Attack 
            {attack} 
            on:selection={({ detail : attack }) => bubble("selection", { attack, column })}
        />
        <Stance origin={attack.ending}/>
    {/each}
</div>



<script>
    import { createEventDispatcher } from "svelte";

    import Attack from "components/attack.svelte";
    import Stance from "components/stance.svelte";

    const bubble = createEventDispatcher();

    export let attacks = [];
    export let origin = "FRONT_RIGHT";

    // TODO: Linked list with probably reduceRight
</script>
            
<style>
    .string {
        display: flex;
        justify-content: center;
        align-items: center;
    }
</style>