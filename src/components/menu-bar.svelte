<svelte:window on:keydown={({ key }) => key === "Escape" ? state.send("BACK") : false } />

<div class="menu">

    <div class="section title">
        {#if overview} 
            Absolver.dev 
        {:else}
            <span class="return" on:click={() => state.send("BACK")}>
                BACK
            </span>
        {/if}
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
            data-clipboard-dependent 
            data-clipboard-text="{`https://absolver.dev/?deck=${encode($deck)}`}"
            class="button"
        > 
            Share 
        </button>

        {#if copied}
            <div 
                class="copy-success"
                transition:fade> Successfully copied deck URL to clipboard! </div>
        {/if}
    </div>
</div>

<script>
import clipboard from "clipboard";
import { fade } from "svelte-transitions";
import { state } from "state/state.js"
import { deck } from "stores/deck.js";
import weapon, { equip } from "stores/weapon.js";

import transition from "actions/send-state.js";

import { encode } from "utilities/encoder.js";

const clippy = new clipboard("[data-clipboard-dependent]");

let copied = false;

const sword = transition("EQUIP_SWORD");
const barehands = transition("EQUIP_BAREHANDS");

$: overview = $state.matches("overview");
$: disabled = !overview;
$: hands = $weapon === "barehands";
$: blade = $weapon === "sword";


clippy.on("success", () => (copied = true))
</script>

<style>
.menu {
    display: flex;

    align-items: center;
    justify-content: flex-start;

    background: rgba(255, 255, 255, 0.2);
    color: #FFF;
    width: 100%;
    height: 100%;
    padding: 0.5rem 0;

    border-bottom: 0.1rem solid #000;
}

.section.title {
    margin: 0;
    border: 0;
    padding: 0 1rem;
    
    width: 18rem;

    font-size: 2rem;
}

.section {
    height: 100%;

    display: flex;
    align-items: center;

    padding: 1rem;
    border-left: 0.1rem solid black;
}

.share {
    border-left: 0.1rem solid black;
    width: 100%;
}

.copy-success { 
    padding: 0 0.5rem;
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
    outline: 0.1rem solid var(--color-gold);
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

.return {
    cursor: pointer;
}
</style>
