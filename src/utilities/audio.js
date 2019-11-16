const AUDIO = {
    hover : "https://www.w3schools.com/html/horse.mp3",
    click : "https://www.w3schools.com/html/horse.mp3",
};

const audio = (source) => new Audio(source);

const click = audio(AUDIO.CLICK);
const hover = audio(AUDIO.HOVER);

export {
    click,
    hover,
};
