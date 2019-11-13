<div class="fullscreen">
    <p> You've slotted a move that is incompatible with the moves that come after it.</p>
    <p> Would you like to place this move anyway? </p>
    <div class="modal">
        <button class="button" on:click={() => service.send("ACCEPT")}>Yes</button> 
        <button class="button" on:click={() => service.send("REJECT")}>No</button>
    </div>
</div>

<script>
import { service } from "state/state.js";
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
        align-items: center;

        width: 30rem;
        height: 10rem;

        background-color: darkslategray;
    }
</style>