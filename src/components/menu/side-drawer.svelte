<script>
    import { fly } from "svelte/transition";
    import { state } from "state/state.js";

    $: show = $state.matches("menu.shown");

    import clipboard from "clipboard";
    import { deck } from "stores/deck.js";
    import weapon, { equip } from "stores/weapon.js";
    import { enableColors, enableTypeLabel } from "stores/settings.js";

    import transition from "actions/send-state.js";

    import { encode } from "utilities/encoder.js";

    $: url = `https://absolver.dev/?deck=${encode($deck)}${window.location.href.includes("plus") ? "&plus" : ""}`;

    const clippy = new clipboard("[data-clipboard-dependent]");

    const sword = transition("EQUIP_SWORD");
    const barehands = transition("EQUIP_BAREHANDS");

    $: hands = $weapon === "barehands";
    $: blade = $weapon === "sword";

    clippy.on("success", () => (copied = true));
</script>

{#if show}
    <div class="container" transition:fly={{ x: -500 }}>
        <div class="title">Absolver.dev</div>
        <div class="section">
            <h1 class="section-header">Build a deck for...</h1>
            <div class="section-content">
                <button
                    class="button barehands"
                    data-active={hands}
                    use:barehands
                >
                    Barehands
                </button>

                <button class="button sword" data-active={blade} use:sword>
                    Sword
                </button>
            </div>
        </div>

        <div class="section">
            <h1 class="section-header">Display Settings</h1>
            <div class="section-content">
                <p class="setting-text">Enable Colors:</p>
                <label class="switch">
                    <input type="checkbox" bind:checked={$enableColors} />
                    <span class="slider round"></span>
                </label>
            </div>
            <div class="section-content">
                <p class="setting-text">Enable Hit Location Label:</p>
                <label class="switch">
                    <input type="checkbox" bind:checked={$enableTypeLabel} />
                    <span class="slider round"></span>
                </label>
            </div>
        </div>

        <div class="section share">
            <h1 class="section-header">Share your deck</h1>
            <div class="section-content">
                <input
                    data-clipboard-dependent
                    class="deck"
                    type="text"
                    bind:value={url}
                />
            </div>
        </div>
    </div>
{/if}

<style>
    .title {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 1rem 1rem 1rem 4rem;

        color: var(--color-mork-cream);
        font-size: 4rem;
    }

    .container {
        display: flex;
        flex-flow: column nowrap;
        position: absolute;
        z-index: 5;
        left: 0;
        top: 0;

        height: 100%;
        width: 25%;

        padding: 0 1rem 1rem 1rem;
        background: #21243d;
        border-right: 0.5rem solid var(--color-mork-cream);
        color: var(--color-mork-cream);
    }

    .section {
        padding: 0.5rem 0;

        display: flex;
        flex-flow: column nowrap;
    }

    .section-header {
        padding: 0.5rem 0;

        border-bottom: 0.2rem solid var(--color-mork-cream);
    }

    .section-content {
        display: flex;
        flex-flow: row wrap;
        align-items: center;
    }

    .button {
        outline: 0;
        height: 3rem;
        border: 0;
        margin: 0.25rem;
        font-weight: bold;

        flex: 1;

        cursor: pointer;
        opacity: 0.6;
    }

    .button[data-active="true"] {
        background-color: var(--color-mork-red);
        color: var(--color-mork-cream);

        opacity: 1;
    }

    .deck {
        height: 2rem;
        width: 100%;

        font-size: 0.6rem;
        font-weight: bold;
    }

    .setting-text {
        font-weight: bold;
        margin-right: 0.5rem;
    }

    /* The switch - the box around the slider */
    .switch {
        position: relative;
        display: inline-block;
        width: 60px;
        height: 34px;
    }

    /* Hide default HTML checkbox */
    .switch input {
        opacity: 0;
        width: 0;
        height: 0;
    }

    /* The slider */
    .slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: var(--color-mork-dark-blue);
        -webkit-transition: 0.4s;
        transition: 0.4s;
    }

    .slider:before {
        position: absolute;
        content: "";
        height: 26px;
        width: 26px;
        left: 4px;
        bottom: 4px;
        background-color: var(--color-mork-cream);
        -webkit-transition: 0.4s;
        transition: 0.4s;
    }

    input:checked + .slider {
        background-color: var(--color-mork-red);
    }

    input:focus + .slider {
        box-shadow: 0 0 1px var(--color-mork-red);
    }

    input:checked + .slider:before {
        -webkit-transform: translateX(26px);
        -ms-transform: translateX(26px);
        transform: translateX(26px);
    }

    /* Rounded sliders */
    .slider.round {
        border-radius: 34px;
    }

    .slider.round:before {
        border-radius: 50%;
    }
</style>
