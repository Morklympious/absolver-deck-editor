<script>
    // eslint-disable-next-line
    export let position = "TR";

    const stances = {
        FL : "10 10",
        FR : "90 10",
        BL : "10 90",
        BR : "90 90",
    };

    $: stance = `M 50 50 L ${stances[position]}`;
</script>

<style>
    .svg {
        width: 3rem;
        height: 3rem;
    }
</style>


<svg class="svg" viewBox="0 0 100 100">
    <g class="group" fill="gray">
        <polygon points="0 50, 50 0, 100 50, 50 100" />
        <path d="{stance}" stroke="black" stroke-width="4"/>
    </g>
</svg>