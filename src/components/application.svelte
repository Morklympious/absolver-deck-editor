<!-- NOTE TO SELF: It doesn't work in an each (without a workaround), but it works solo like this. -->
<!-- {#each components as { component, children, props }, index (index) } -->
<svelte:component 
    this={component}
    {children}
    {...props}
/>
<!-- {/each} -->

<script>
import { tree } from "state/state.js";

let components = [];

$: [ root = false ] = components;
$: ({ component, children, props } = root);

// If you use the each, spread this in the svelte:component because otherwise child components don't... get there.
// const workaround = {};

// We only care about the first chart
tree(([ structure ]) => {
    components = structure.children;
});
</script>
