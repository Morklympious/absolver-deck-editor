<div class="selection">
    {#each [ ...pool.entries() ] as [ stance, attacks ] (stance)}
        <h2>Destination: {stance}</h2>
        {#each attacks as attack (attack.name)}
            <p>{attack.name}</p>
        {/each} 
    {/each}
</div>

<script>

// pool comes from the context in the statechart.
export let pool;
</script>

<style>
    .selection {
        background: rgba(0,0,0, 0.3);
    }
</style>