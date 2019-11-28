<div class="toggle">
    <button 
        class="weapon barehands" 
        data-active={barehands}
        on:click={() => service.send("EQUIP_BAREHANDS")}
    >
        BH
    </button>

    <button 
        class="weapon sword" 
        data-active={sword}
        on:click={() => service.send("EQUIP_SWORD")}
    >
        SW
    </button>
</div>

<script>
import { service } from "state/state.js"; 
import weapon, { equip } from "stores/weapon.js";

$: barehands = $weapon === "barehands";
$: sword = $weapon === "sword";
$:console.log($weapon);
</script>

<style>
    .toggle {
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .weapon {
        border: none;
        outline: none;
        padding: 1rem;
        color: white;
        background: black;
        cursor: pointer
    }

    .weapon[data-active="true"] {
        outline: 1px solid gold;
    }
</style>