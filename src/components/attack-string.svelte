<div class="string">
    <!-- 
        <Stance /> here is outside the each loop because it's inherent to the 
        String and not necessarily the attack that gets slotted. 

        Meanwhile, we're assuming after that that every attack will be followed by
        a "where do I end up" (Stance) indicator
    -->
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
    export let origin = { face : "FRONT", look : "RIGHT" };

    //TODO: This component will probably want to set all of its data in a store. 
    // Since multiple components are gonna modify the store data.

    // NOTE: This should probably be a linked list?
    // { ...attack, next : { ...attack }}
    // We will have to massage the data for something like this.
</script>
            
<style>
    .string {
        display: flex;
        justify-content: center;
        align-items: center;
    }
</style>