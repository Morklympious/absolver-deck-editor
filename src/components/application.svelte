{#each components as { component, children, props }}
    <svelte:component 
        this={component}
        {children}
        {...props}
    />
{/each}

<script>
import tree from "state/editor.js";

let components = [];

// Adding this as a spread above corrects the whole
// "children not being passed... thing"
const maybe = {};

// We only care about the first chart
tree(([ structure ]) => {
    components = structure.children;
});
</script>
