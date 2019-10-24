<script>
    import Attack from "components/attack.svelte";
    import Stance from "components/stance.svelte";

    export let attacks = [];
    export let stance = { face : "FRONT", look : "RIGHT" };

    $: [ first = false, second = false, third = false ] = attacks;

    //TODO: This component will probably want to set all of its data in a store. 
    // Since multiple components are gonna modify the store data.
</script>
            
<style>
    .string {
        display: flex;
        justify-content: center;
        align-items: center;
    }
</style>
        
<div class="string">
    <Stance {stance}/>
    <Attack begins="{stance}" />
    <Stance />
    <Attack />
    <Stance />
</div>