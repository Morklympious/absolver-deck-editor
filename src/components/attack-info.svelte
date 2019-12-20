<div class="metadata">
    <div class="metadata-card">
        <h1>{attack.name}</h1>
        <div class="attack" {style}></div>
        <div class="stats">
            
        
        </div>
    </div>
</div>



<script>
import Attack from "components/attack-tile.svelte";
export let attack;

$: art = attack.name.split(" ").join("-").toLowerCase();
$: style = art ? `background-image: url("assets/images/${art}.png")` : ``;
</script>

<style>
    .metadata {
        grid-area: metadata;

        display: flex;
        justify-content: center;
        align-items: center;

        color: #CCC;
    }

    .metadata-card {
        display: flex;
        justify-content: center;
        align-items: center;
        flex-flow: column nowrap;
    }

    .attack {
        width: 15rem;
        height: 15rem;

        background-position: center;
        background-color: var(--color-gray);
        background-position: center;
        background-repeat: no-repeat;
    }
</style>