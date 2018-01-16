const watching = process.env.WATCHING;

module.exports = {
    input: "./src/index.js",
    
    output : {
      file      : "./dist/bundle.js",
      format    : "iife",
      name      : "deckeditor",
      banner    : `/* eslint-disable */`
    },

    plugins: [
      require("rollup-plugin-node-resolve")(),
      require("rollup-plugin-commonjs")(),

      require("rollup-plugin-svelte")({
        css : false
      }),

      require("modular-css-rollup")({
        css : "./dist/bundle.css",
      }),

      require("rollup-plugin-buble")({
          exclude : ["**/node_modules/**"]
      }),

      watching && require("rollup-plugin-serve")({
        contentBase : [ "./" ],
        historyApiFallback : true
      }),

      watching && require("rollup-plugin-livereload")({
        watch : "./build"
      })
    ]
  };