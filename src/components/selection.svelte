<div class="selection">

</div>

<script>
    export let followups;

    $: console.log($$props);
</script>

<style>
    .selection {
        position: absolute;
        
        height: 100%;
        width: 100%;

        background: rgba(0,0,0, 0.3);
    }
</style>