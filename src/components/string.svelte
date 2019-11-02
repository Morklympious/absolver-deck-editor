<div class="string">
    <Stance {stance}/>
    <Attack on:selection="{({ detail }) => bubble("selection", detail)}" begins="{stance}" />
    <Stance />
    <Attack />
    <Stance />
    <Attack />
    <Stance />
</div>

<script>
    import { createEventDispatcher } from "svelte";
    import Attack from "components/attack.svelte";
    import Stance from "components/stance.svelte";

    const bubble = createEventDispatcher();

    export let attacks = [];
    export let stance = { face : "FRONT", look : "RIGHT" };

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