import { Howl } from "howler";

const AUDIO = {
    HOVER : "assets/audio/hover.mp3",
    CLICK : "assets/audio/selection.mp3",
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
