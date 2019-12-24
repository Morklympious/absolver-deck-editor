<div class="metadata">
    <div class="metadata-card">
        <h1 class="name">{attack.name}</h1>
        <div class="attack" {style}></div>
        <div class="stats">

        {#each stats as { stat, data }} 
        <div class="stat">
            <span>{stat}</span>
            <span>{data}</span>
        </div>    
        {/each}
        </div>
    </div>
</div>



<script>
import Attack from "components/attack-tile.svelte";

export let attack = false;
export let quadrant = "FRONT_RIGHT";

const opposite = (side) => side === "LEFT" ? "RIGHT" : "LEFT";

$: ({
    name      = "",
    height    = "mid",
    type      = "thrust",
    stance    = false,
    hits = "same",
    style : fstyle = "forsaken",
    frames    = { advantage : false },
    modifiers = [],
    _meta     = { empty : true, begins: "" }
} = attack);

$: [look, face] = quadrant.split("_");
$: art = name.split(" ").join("-").toLowerCase();
$: style = art ? `background-image: url("assets/images/${art}.png")` : ``;
$: stats = [
    { stat : "Name", data : name  },
    { stat : "Style", data : fstyle },
    { stat : "Height", data : height },
    { stat : "Side", data : hits === "same" ? face : opposite(face)},
    { stat : "Type", data : type },
    { stat : "Hit", data : frames.advantage.hit},
    { stat : "Guard", data : frames.advantage.guard},
];

</script>

<style>
    .metadata {
        grid-area: metadata;

        display: flex;
        justify-content: center;
        align-items: center;

        color: #CCC;

        width: var(--attack-info-container-width, 20rem);
    }

    .metadata-card {
        display: flex;
        justify-content: center;
        align-items: center;
        flex-flow: column nowrap;

        width: 100%;
    }

    .name {
        color: var(--color-gold);
        width: 100%;

        font-size: 1.2rem;
    }

    .attack {
        width: 100%;
        height: 15rem;

        background-position: center;
        background-color: var(--color-gray);
        background-position: center;
        background-repeat: no-repeat;
    }

    .stats {
        width: 100%;
        font-weight: 800;
    }

    .stat {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        height: 2rem;
        width: 100%;

        padding: 0.5rem;
    }

    .stat:nth-of-type(even) {
        background: var(--color-gray);
    }

    .stat:nth-of-type(odd) {
        background: var(--color-gray-dark);
    }
</style>