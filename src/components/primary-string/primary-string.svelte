<script>
    import Attack from "components/attack.svelte";
    import Stance from "components/stance.svelte";

    export let attacks = [];
    export let begins = "F";

    const ending = ({ stance }) => (stance ? `${stance.ends}${stance.pivot ? "L" : "R"}` : "FR");

    $: [ first = false, second = false, third = false ] = attacks;
</script>
            
<style>
    .string {
        display: flex;
        justify-content: center;
        align-items: center;
    }
</style>
        
<div class="string">
    <Stance position="{begins}" />
    <Attack {...first} stance="{{ begins : "F" }}"  />
    <Stance position="{ending(first)}" />
    <Attack {...second} stance="{{ begins " />
    <Stance position="{ending(second)}" />
    <Attack {...third}  />
    <Stance position="{ending(third)}" />
</div>