<div class="flex container">
    <div class="flex attack" style="background-image: url(images/barehands/{art}.png)">
        <div class="data">
            <div class="data name" >
                {name} {start}
            </div>
        </div>    
    </div>
</div>

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


<script>
import { barehands, front, back } from "stores/store.js";

import Stance from "./stance.svelte";

export let modifiers = [];

export let name = "";
export let height = "";
export let type = "thrust";
export let stance = {};

$: art = name.split(" ").join("-").toLowerCase()
$: start = stance.begins;


</script>
