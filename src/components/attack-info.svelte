<div class="metadata">
    <div class="metadata-card">
        <h1 class="name">{scream(attack.name)}</h1>
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
export let attack = false;
export let quadrant = "FRONT_RIGHT";

$: ({
    name = "",
    height = "mid",
    type = "thrust",
    stance = false,
    hits = "same",
    style : fstyle = "forsaken",
    frames = { advantage : false },
    modifiers = [],
    _meta = { empty : true, begins : "" },
} = attack);

const scream = (data = false) => (data.toUpperCase ? data.toUpperCase() : data);
const opposite = (side) => (side === "LEFT" ? "RIGHT" : "LEFT");

$: [ look, face ] = quadrant.split("_");
$: art = name.split(" ").join("-")
.toLowerCase();
$: style = art ? `background-image: url("assets/images/${art}.png")` : ``;
$: stats = [
    { stat : "NAME", data : scream(name)    },
    { stat : "HITS", data : `${scream(height)} - ${scream(type)}` },
    { stat : "Type", data : scream(type) },
    { stat : "SIDE", data : hits === "same" ? scream(face) : scream(opposite(face)) },
    { stat : "STARTUP", data : frames.startup },
    { stat : "HIT ADV", data : frames.advantage.hit },
    { stat : "GUARD ADV", data : frames.advantage.guard },
];

</script>

<style>
    .metadata {
        grid-area: metadata;
        display: var(--attack-selection-attack-info-display, flex);
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
        background-position: center;
        background-repeat: no-repeat;
    }

    .stats {
        width: 100%;
        color: #FFF;
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
</style>