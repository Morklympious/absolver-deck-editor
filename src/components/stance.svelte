<svg class="svg" viewBox="0 0 100 100">
    <g class="group" fill="gray">
        <polygon points="0 50, 50 0, 100 50, 50 100" />
        <path class="marker" d="{path}" stroke="black" stroke-width="4"/>
    </g>
</svg>

<script>
    export let quadrant = "FRONT_RIGHT";
    
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
        width: 3rem;
        height: 3rem;

    }

    .marker { 
        fill: black;
    }
</style>
