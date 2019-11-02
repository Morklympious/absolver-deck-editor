<div class="selection">
    {#each [...$pool.entries() ] as [ stance, attacks ] (stance)}
        <h2>Destination: {stance}</h2>
        {#each attacks as attack (attack.name)}
            <p>{attack.name}</p>
        {/each} 
    {/each}
</div>

<script>
import { pool } from "stores/deck.js";
</script>

<style>
    .selection {
        position: absolute;
        
        height: 100%;
        width: 100%;

        background: rgba(0,0,0, 0.3);
    }
</style>