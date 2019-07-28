import path from "path";
import buble from "rollup-plugin-buble";
import serve from "rollup-plugin-serve";
import livereload from "rollup-plugin-livereload";
import cjs from "rollup-plugin-commonjs";
import resolve from "rollup-plugin-node-resolve";
import svelte from "rollup-plugin-svelte";
const { preprocess, processor } = require("@modular-css/svelte")({
    // Processor options
});

import mcss from "@modular-css/rollup";
import globsync from "rollup-plugin-globsync";
import alias from "./build/aliases.js";

export default {
    input : "./src/index.js",

    output : {
        file      : "./dist/bundle.js",
        format    : "iife",
        name      : "editor",
        sourcemap : "inline",
    },

    plugins : [
        // Play nice with the Node.js ecosystem
        resolve(),
        cjs(),

        // lol so bored
        svelte(),

        // Turns es2015 into ES5
        buble(),

        alias({
            components : path.resolve(__dirname, "./src/components/"),
            stores     : path.resolve(__dirname, "./src/stores/")
        }),

        globsync({
            patterns : [
                "**/*.svg",
                "**/*.png",
            ],
            dest    : "./dist",
            options : {
                dir : `${process.cwd()}./src`
            }
        }),

        // Hot-reload blah blah idc.
        serve(),
        livereload({ watch : [ "./dist" ] }),
    ],
};
