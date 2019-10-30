<div class="layout">
    <String stance="{{face : "FRONT", look : "RIGHT"}}" />
    <String stance="{{face : "FRONT", look : "LEFT"}}"  />
    <String stance="{{face : "BACK", look : "LEFT"}}"  />
    <String stance="{{face : "BACK", look : "RIGHT"}}"  />

    <!-- Just call `service.send("SELECTION")` to transition to the state that has children -->
    {#each children as child}
        <!-- Putting this here for now to just see if we got children or not. -->
        DESCENDANT DETECTED
    {/each}

</div>


<script>
import String from "components/string.svelte";

export let children;
export let props;
export let component;

$: console.log("[LAYOUT] PROPS", $$props);

</script>

<style>
    .layout {
        height: 100%;
        width: 100%;

        padding: 2rem;
    }
</style>
