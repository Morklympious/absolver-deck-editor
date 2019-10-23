<div class="layout">
    <String begins="FR" />
    <String begins="FL" />
    <String begins="BL" />
    <String begins="BR" />
</div>

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

<script>
    import { barehands } from "stores/store.js";
    
    import String from "components/string/string.svelte";
</script>