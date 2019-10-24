<script>
    export let stance = { face: "FRONT", look: "RIGHT" };
    
    const stances = {
        FRONT_LEFT : "10 10",
        FRONT_RIGHT : "90 10",
        BACK_LEFT : "10 90",
        BACK_RIGHT : "90 90",
    };

    $: position = `${stance.face}_${stance.look}`;
    $: path = `M 50 50 L ${stances[position]}`;
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
        <path d="{path}" stroke="black" stroke-width="4"/>
    </g>
</svg>