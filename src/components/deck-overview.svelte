
{#each $primaries as { stance, attacks, flow }, row (stance)}
    <String 
        {stance}
        {attacks}
        {flow}
        {row}
    />
{/each}

<script>
import { qmap, quadrants } from "utilities/quadrants.js";
import followups from "utilities/followups.js";

import String from "components/attack-string.svelte";

import { primaries } from "stores/deck.js";
</script>

