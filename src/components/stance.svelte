<svg class="svg" viewBox="0 0 100 100">
    <g class="group" fill="gray">
        <polygon points="0 50, 50 0, 100 50, 50 100" />
        <path d="{path}" stroke="black" stroke-width="4"/>
    </g>
</svg>

<script>
    export let stance = "FRONT_RIGHT";
    
    const stances = {
        FRONT_LEFT : "10 10",
        FRONT_RIGHT : "90 10",
        BACK_LEFT : "10 90",
        BACK_RIGHT : "90 90",
    };

    $: path = `M 50 50 L ${stances[stance]}`;
</script>

<style>
    .svg {
        width: 3rem;
        height: 3rem;
    }
</style>
