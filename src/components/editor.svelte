{#each components as { component, children, props }}
<!-- 
    NOTE: Holy good lord what the fuck
    {...props} is doing some real... shit.

    - Squashes children if props is spread by itself
    - `children` is passed to Layout just fine if {...props} is omitted
    - {...maybe} in conjunction with {...props} makes everything work
    - ... what?
-->
    <svelte:component 
        this={component}
        {children}
        {...props}
        {...maybe}
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
