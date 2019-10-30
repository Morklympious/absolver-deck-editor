<div class="layout">
    <String stance="{{face : "FRONT", look : "RIGHT"}}" />
    <String stance="{{face : "FRONT", look : "LEFT"}}"  />
    <String stance="{{face : "BACK", look : "LEFT"}}"  />
    <String stance="{{face : "BACK", look : "RIGHT"}}"  />
</div>

{#each children as child}
    DESCENDERINO
{/each}

<script>
import String from "components/string.svelte";

export let children;
export let props;
export let component;

$: console.log("PROPS", $$props);
$: console.log("[LAYOUT]", $$props);

</script>

<style>
    .layout {
        height: 100%;
        width: 100%;

        padding: 2rem;
    }
</style>
