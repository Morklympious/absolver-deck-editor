<div class="layout">
    <String stance="{{face : "FRONT", look : "RIGHT"}}" />
    <String stance="{{face : "FRONT", look : "LEFT"}}"  />
    <String stance="{{face : "BACK", look : "LEFT"}}"  />
    <String stance="{{face : "BACK", look : "RIGHT"}}"  />
</div>

<script>
import String from "components/string.svelte";
</script>

<style>
    .layout {
        height: 100%;
        width: 100%;

        padding: 2rem;
    }

    .string {
        display: flex;
        flex-wrap: wrap;

        align-items: center;
    }
</style>
