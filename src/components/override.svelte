<div class="fullscreen">
    <div class="modal">
        <p> You've slotted a move that is incompatible with the moves that come after it.</p>
        <p> Would you like to place this move anyway? </p>
        <div class="actions">
            <button class="button" use:accept> Yes </button> 
            <button class="button" use:reject> No </button>
        </div>
    </div>
</div>

<script>
import { state } from "state/state.js";
import transition from "actions/send-state.js";

const accept = transition("ACCEPT");
const reject = transition("REJECT");
</script>

<style>
    p {
        margin: 0;    
    }

    .fullscreen {
        position: fixed;
        display: flex;
        flex-flow: column nowrap;

        top: 0;

        justify-content: center;
        align-items: center;
        
        height: 100%;
        width: 100%;

        font-weight:700;
        color: white;
        background: rgba(0, 0, 0, 0.5);
    }

    .button {
        padding: 1rem;
        border: 0.1rem solid black;
    }

    .button:hover {
        color: white;
        background-color: black;
        border-color: white;
    }

    .modal {
        display: flex;
        justify-content: space-around;
        padding: 1rem;

        flex-flow: column nowrap;

        width: 30rem;
        height: 10rem;

        background-color: black;
    }

    .actions {
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .button {
        width: 5rem;
    }
</style>