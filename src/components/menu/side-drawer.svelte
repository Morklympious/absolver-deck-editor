{#if show}
<div class="container" transition:fly={{ x : -500 }}>
    <div class="title">Absolver.dev</div>
    <div class="section toggle">
        <button 
            class="button barehands"
            data-active={hands}
            use:barehands
        >
            Fist
        </button>

        <button 
            class="button sword" 
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
    </div>
</div>
{/if}

<style>
    .title {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 4rem;
        padding: 1rem 1rem 1rem 4rem;

        color: var(--color-mork-cream);
        font-size: 2rem;
    }

    .container {
        position: absolute;
        left: 0;
        top: 0;


        height: 100%;
        width: 25%;

        padding: 0 1rem 1rem 1rem;
        background: rgba(0,0,0,0.8);
        border-right: 0.5rem solid var(--color-mork-cream)
    }

    .section {
        padding: 0.5rem 0;

        display: flex;
        flex-flow: column nowrap;
    }

    .button {
        outline: 0;
        height: 3rem;
        border: 0;
        margin: 0.25rem;
        font-weight: bold;
    }
</style>

<script>
import { fly } from "svelte/transition";
import { state } from "state/state.js";

$: show = $state.matches("menu.shown");

import clipboard from "clipboard";
import { deck } from "stores/deck.js";
import weapon, { equip } from "stores/weapon.js";

import transition from "actions/send-state.js";

import { encode } from "utilities/encoder.js";

const clippy = new clipboard("[data-clipboard-dependent]");

const sword = transition("EQUIP_SWORD");
const barehands = transition("EQUIP_BAREHANDS");

$: hands = $weapon === "barehands";
$: blade = $weapon === "sword";

// clippy.on("success", () => (copied = true))
</script>