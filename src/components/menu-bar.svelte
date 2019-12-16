<svelte:window on:keydown={({ key }) => key === "Escape" ? state.send("BACK") : false } />

<div class="menu">
    <div class="section title">
        Absolver.dev 
    </div>

    <div class="section toggle">
        <button 
            class="button barehands" 
            {disabled}
            data-active={hands}
            use:barehands
        >
            Fist
        </button>

        <button 
            class="button sword" 
            {disabled}
            data-active={blade}
            use:sword
        >
            Sword
        </button>
    </div>

    <div class="section share">
        <button 
            class="button"
            on:click={() => (encoded = encode($deck))}
        > 
            share 
        </button>

        <input class="input" type="text" bind:value={encoded} />
    </div>
</div>

<script>
import { state } from "state/state.js"
import { deck } from "stores/deck.js";
import weapon, { equip } from "stores/weapon.js";

import transition from "actions/send-state.js";

import { encode } from "utilities/encoder.js";

let encoded = "";

$: overview = $state.matches("overview");
$: disabled = !overview;

const sword = transition("EQUIP_SWORD");
const barehands = transition("EQUIP_BAREHANDS");

$: hands = $weapon === "barehands";
$: blade = $weapon === "sword";
</script>

<style>
.menu {
    display: flex;

    align-items: center;
    justify-content: flex-start;

    background: #444;

    width: 100%;
    height: 100%;
    padding: 0.5rem 0;
}

.section.title {
    margin: 0;
    border: 0;
    padding: 0 1rem;
    color: #DDD;
    font-size: 2rem;
}

.section {
    height: 100%;

    display: flex;
    justify-content: center;
    align-items: center;

    padding: 1rem;
    border-left: 0.1rem solid black;
}

.share {
    border-left: 0.1rem solid black;
    width: 100%;
}

.button {
    outline: 0;
    width: 6rem;
    height: 3rem;

    background: #222;
    border: 0;

    outline: 0.1rem solid transparent;
    color: #eee;

    transition: all 250ms linear;
}

.button:hover {
    background: #666;
}
.button + .button {
    margin-left: 0.5rem;
}

.button[data-active="true"] {
    outline: 0.1rem solid #feec55;
}

.button[disabled] {
    opacity: 0.4;
    pointer-events: none;
}

.input {
    flex: 1;
    height: 2.5rem;
    margin: 0 1rem;
}
</style>
