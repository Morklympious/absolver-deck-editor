{#each components as { component, children, props }}
    <svelte:component 
        this={component}
        {children}
        {...props}
    />
{/each}

<script>
import { tree } from "state/editor.js";

let components = [];

// We only care about the first chart
tree(([ structure ]) => {
    components = structure.children;
});
</script>
