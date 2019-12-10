<div class="menu">
    <div class="section title">
        Absolver.dev 
    </div>

    {#if overview}
    <div class="section toggle">
        <WeaponToggle />

        <div class="section share">
            <button 
                class="button"
                on:click={() => console.log(encode($deck))}
            > 
                share 
            </button>
        </div>
    </div>
    {/if}    
</div>

<script>
import { state } from "state/state.js"
import { deck } from "stores/deck.js";
import { encode } from "utilities/encoder.js";
import WeaponToggle from "components/weapon-toggle.svelte";

$: overview = $state.value === "overview";
</script>

<style>
.menu {
    display: flex;

    align-items: center;
    justify-content: flex-start;

    background: #444;

    width: 100%;
    height: 100%;
    padding: 0.5rem 0;
}

.section.title {
    margin: 0;
    border: 0;
    padding: 0 1rem;
    color: #DDD;
    font-size: 3rem;
}

.section {
    height: 100%;

    display: flex;
    justify-content: center;
    align-items: center;

    padding-left: 1rem;
    margin-left: 1rem;
    border-left: 0.1rem solid black;
}

.share {
    margin-left: 1rem;
    border-left: 0.1rem solid black;
}

.button {
    outline: 0;
    width: 6rem;
    height: 100%;
}
</style>
