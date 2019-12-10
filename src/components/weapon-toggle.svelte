<div class="toggle">
    <button 
        class="weapon barehands" 
        data-active={hands}
        use:barehands
    >
        Fist
    </button>

    <button 
        class="weapon sword" 
        data-active={blade}
        use:sword
    >
        Sword
    </button>
</div>

<script>
import { state } from "state/state.js"; 
import transition from "actions/send-state.js";
import weapon, { equip } from "stores/weapon.js";

const sword = transition("EQUIP_SWORD");
const barehands = transition("EQUIP_BAREHANDS");

$: hands = $weapon === "barehands";
$: blade = $weapon === "sword";
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

        width: 6rem;

        padding: 1rem;
        color: white;
        background: black;
        cursor: pointer
    }

    .weapon[data-active="true"] {
        outline: 0.1rem solid gold;
    }
    
    .weapon + .weapon {
        margin-left: 0.5rem;
    }
</style>