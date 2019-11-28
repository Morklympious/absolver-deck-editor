import babel from "rollup-plugin-babel";
import serve from "rollup-plugin-serve";
import livereload from "rollup-plugin-livereload";
import cjs from "rollup-plugin-commonjs";
import resolve from "rollup-plugin-node-resolve";
import svelte from "rollup-plugin-svelte";
import globsync from "rollup-plugin-globsync";
import json from "@rollup/plugin-json";

import alias from "./build/alias.js";
import aliases from "./build/aliases.js";

const watching = process.env.ROLLUP_WATCH;

export default {
    input : "./src/editor.js",

    output : {
        file      : "./dist/bundle.js",
        format    : "iife",
        name      : "editor",
        sourcemap : "inline",
    },

    onwarn(warning, warn) {
        const {
            code = "",
            id = "",
            importer = "",
            pluginCode = "",
            plugin = "",
        } = warning;

        // xstate ಠ_ಠ
        if(code === "THIS_IS_UNDEFINED" && id.includes("\\xstate")) {
            return;
        }

        // xstate ಠ_ಠ
        if(code === "CIRCULAR_DEPENDENCY" && importer.includes("\\xstate")) {
            return;
        }

        warn(warning);
    },

    plugins : [
        // Play nice with the Node.js ecosystem
        resolve({
            browser : true,
        }),

        json(),

        cjs(),

        // lol so bored
        svelte(),

        // Turns es2015 into ES5
        babel({
            exclude : "node_modules/**",
        }),

        // Environmental transforms for dependencies
        require("rollup-plugin-replace")({
            values : {
                "process.env.NODE_ENV" : JSON.stringify("production"),
            },
            include : "node_modules/**",
        }),

        alias(aliases),

        globsync({
            patterns : [
                "**/*.svg",
                "**/*.png",
                "**/*.mp3",
                "**/index.html",
                "**/base.css",
            ],
            dest : "./dist",

            options : {
                transform : (path) => path.replace("src/", ""),
                clean     : true,
            },
        }),

        // Hot-reload blah blah idc.
        watching && serve("dist"),
        watching && livereload({ watch : [ "./dist" ] }),
    ],
};
