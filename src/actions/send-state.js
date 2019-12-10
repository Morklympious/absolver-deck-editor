import { state } from "state/state.js";

const action = (event) => (node) => {
    const handler = () => state.send(event);

    node.addEventListener("click", handler);
    
    return () => node.removeEventListener("click", handler);
};

export default action;
