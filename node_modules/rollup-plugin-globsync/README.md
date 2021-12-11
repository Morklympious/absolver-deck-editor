# 🔎📂`rollup-plugin-globsync`

Rollup plugin to take a list of globs, copy them on the first build, and optionally watch for changes and sync those over afterwards.

## Installation

```bash
$> npm install rollup-plugin-globsync -D
```

## Usage

In a `rollup.config.js` file:

```js
import globsync from "rollup-plugin-globsync";

export default {
    // ...
    plugins : [
        globsync({
            patterns : [
                "**/*.jpg",
                "!**/*.js",
                "./except/this/one.js"
            ],
            dest : "./dist",
            options : {
                // ...
            }
        })
    ]
}
```

### Watching the filesystem

This plugin will automatically watch the filesystem for changes and copy them to `dest` whenever rollup itself is started in [watch mode](https://rollupjs.org/guide/en#-w-watch).

Watch mode can be enabled for rollup using the CLI

```bash
$> rollup --config --watch
```

or via the API

```js
import { rollup } from "rollup";

import globsync from "rollup-plugin-globsync";

rollup.watch({
    // ...
    plugins : [
        globsync({ /* ... */ })
    ]
});
```

## Configuration

### `patterns`

Array of glob patterns to use for finding files to copy. Negation via leading `!` is supported, as is re-inclusion after negation. Automatically negates `**/node_modules/**` and the `dest` directory.

### `dest`

Directory to copy files into. Defaults to `./dist`.

### `options.dir`

Define the base dir to watch from. Defaults to `process.cwd()`.

### `options.clean`

Whether or not to remove all files within `dist` when rollup starts up. Defaults to `true`.

### `options.transform`

A `(file) => file` function that allows for programatically changing the destination of files. Defaults to the identify function.

### `options.manifest`

A `string` defining a package name for the manifest of files to be copied/watched that you can `import` in your code, in case your bundled code cares about the static files that are being copied alongside it. Defaults to `false`.

### `options.verbose`

A shorthand to enable verbose logging. Defaults to `false`. Overrides `level` option if set.

### `options.level`

Specify the exact level to log at. Defaults to `info`.

Available levels in order of descreasing chattiness are: `silly`, `verbose`, `info`, `silent`.
