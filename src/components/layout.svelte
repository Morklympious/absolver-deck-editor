<div class="layout">
    <String begins="FR" attacks="{$barehands}" />
    <String begins="FL" attacks="{$barehands.slice(6)}" />
    <String begins="BL" attacks="{$barehands.slice(12)}" />
    <String begins="BR" attacks="{$barehands.slice(15)}" />
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
    import String from "components/primary-string/primary-string.svelte";
</script>