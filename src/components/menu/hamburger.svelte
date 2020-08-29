<div class="container" on:click={toggle}>
    <svg class="svg" viewBox="0 0 100 80" width="40" height="40">
        {#if !shown}
        <rect class="rect-x" y="30" width="100" height="20"></rect>
        <rect class="rect-x" y="60" width="100" height="20"></rect>
        <rect class="rect" width="100" height="20"></rect>
        {:else}
        <path d="M10 10, L 90 90 M 90 10 L 10 90" stroke-width="5"/>
        {/if}
    </svg>
</div>

<style>
    .container {
        width: 3rem;
        height: 3rem;
        position: relative;
        z-index: 10;
    }

    .svg {
        width: 100%;
        height: 100%;
        stroke: var(--color-mork-cream);
        fill: var(--color-mork-cream);
    }

</style>

<script>
import { state } from "state/state.js";

$: shown = $state.matches("menu.shown");

const toggle = () => {
    if(!shown) {
        return state.send("SHOW_MENU");
    }

    return state.send("HIDE_MENU");
};
</script>