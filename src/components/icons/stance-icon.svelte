<svg class="svg" viewBox="0 0 100 100" data-empty={empty}>
    <g class="group" fill="gray">
        <polygon class="square" points="0 50, 50 0, 100 50, 50 100" />
        {#if !empty}
        <path class="marker" d="{path}" stroke="black" stroke-width="4"/>
        {/if}
    </g>
</svg>

<script>
    export let quadrant = "FRONT_RIGHT";
    export let empty = false;
    
    const stances = {
        FRONT_LEFT : "40 25 L 10 10 L 25 40 Z",
        FRONT_RIGHT : "60 25 L 90 10 75 40 Z",
        BACK_LEFT : "40 75 L 10 90 L 25 60 Z",
        BACK_RIGHT : "60 75 L 90 90 75 60 Z",
    };

    $: path = `M 50 50 L ${stances[quadrant]}`;
</script>

<style>
    .svg {
        width: var(--stance-icon-dimension, 2rem);
        height: var(--stance-icon-dimension, 2rem);
        margin: 0 1rem;
    }

    .svg[data-empty="true"] {
        opacity: 0.3;
    }

    .square {
        stroke: black;
        stroke-width: 0.2rem;
    }

    .marker { 
        fill: black;
    }
</style>
