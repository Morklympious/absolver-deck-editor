
{#each quadrants as { face, look }}
    <String stance="{{face, look}}" />
{/each}

<script>
import quadrants from "utilities/quadrants.js";
import String from "components/string.svelte";

export let children;
export let props;
export let component;
</script>

