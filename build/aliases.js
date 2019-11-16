const path = require("path");

export default {
    actions    : path.resolve(__dirname, "./src/actions"),
    state      : path.resolve(__dirname, "./src/state/"),
    components : path.resolve(__dirname, "./src/components/"),
    stores     : path.resolve(__dirname, "./src/stores/"),
    images     : path.resolve(__dirname, "./src/assets/images"),
    utilities  : path.resolve(__dirname, "./src/utilities/"),
    data       : path.resolve(__dirname, "./src/data/"),
};
