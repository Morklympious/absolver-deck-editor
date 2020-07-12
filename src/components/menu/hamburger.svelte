<div class="container" on:click={toggle}>
    <svg class="svg" viewBox="0 0 100 80" width="40" height="40">
        <rect width="100" height="20"></rect>
        <rect y="30" width="100" height="20"></rect>
        <rect y="60" width="100" height="20"></rect>
    </svg>
</div>

<style>
    .container {
        width: 2rem;
        height: 2rem;
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