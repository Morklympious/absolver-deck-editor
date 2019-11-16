import { Howl } from "howler";

const AUDIO = {
    HOVER : false, // Waiting for a real source "",
    CLICK : false, // Real source, not horse. "https://www.w3schools.com/html/horse.mp3",
};

const audio = (source) => new Howl({ src : [ source ] });

const action = (event, sound) => (node) => {
    const handler = () => sound.play();

    node.addEventListener(event, handler);
    
    return () => node.removeEventListener(event, handler);
};

const click = action("click", audio(AUDIO.CLICK));
const hover = action("mouseenter", audio(AUDIO.HOVER));

export {
    click,
    hover,
};
