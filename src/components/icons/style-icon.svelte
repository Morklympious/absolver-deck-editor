<div class="style" style="{art}"></div>

<script>
    const STYLES = {
        forsaken : "FSK",
        kahlt    : "KLT",
        windfall : "WND",
        stagger  : "STG",
        faejin   : "FAE",
        unknown  : "???",
    };

    export let style = "unknown";

    $: art = `background-image: url("assets/styles/${style}.svg")`;
</script>

<style>
.style{
    width: 1rem;
    height: 1rem;
}
</style>
