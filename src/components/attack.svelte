<div class="flex container" on:click="{process}">
    {name}
</div>

<script>
import followups from "utilities/followups.js";

export let name = "";
export let height = "";
export let type = "";
export let stance = {};
export let modifiers = [];

// The move really only cares where it originates (for followups), not where it goes.
export let begins = {};

const process = () => {
    service.send("SELECTION");
}

</script>

<style>
    .flex {
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .container {
        position: relative;

        height: 8rem;
        width: 8rem;

        /* TODO: Border when highlighted */
        border: 0.2rem solid #444;
        background-color: #333;
    }

    .attack {
        height: 100%;
        width: 100%;

        background-color: #333;
        background-size: contain;
        background-repeat: no-repeat;
        background-position: center;
    }

    .empty {
        background-color: gold;
    }

    .data {
        position: absolute;
        top: 0.2rem;
        left: 0.2rem;

        width: 100%;
    }

    .name {
        padding: 0.1rem;
        font-size: 0.6rem;
        font-weight: bold;
        
        color: white;
    }

    .modifiers {
        top: 0.2rem;
        left: 0.2rem;
    }
</style>