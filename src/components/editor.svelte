{#each charts as chart}
    {#each chart.children as { component, children, props }}
    <svelte:component this={component} {children} {...props} />
    {/each}
{/each}

beep beep
<script>
import tree from "state/editor.js";

let charts = [];

// Let's just grab everything when the statechart updates.
tree((structure) => {
    charts = structure;
});
</script>
