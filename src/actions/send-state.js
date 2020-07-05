import { state } from "state/state.js";

const action = (event) => (node) => {
    const handler = () => state.send(event);

    node.addEventListener("click", handler);
    node.addEventListener("touchstart", handler);

    return () => {
        node.removeEventListener("click", handler);
        
        node.removeEventListener("touchstart", handler);
    };
};

export default action;
