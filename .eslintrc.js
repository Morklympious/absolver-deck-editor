/* eslint-env node */

module.exports = {
    extends : [
        "@tivac"
    ],
    
    env : {
        es6     : true,
        browser : true
    },

    parserOptions : {
        sourceType   : "module",
        ecmaFeatures : { 
            jsx : true
        },
    },

    plugins: ["eslint-plugin-html", "svelte3"],

    overrides: [
        {
            files: ['**/*.svelte'],
            processor: 'svelte3/svelte3'
        }
    ],
    
    globals : {
        "UIDelegate": true
    },

    rules : {
        // Table stakes for Svelte Computed properties. 
        "no-labels" : 0,
        "no-undef"  : 0,
        "prefer-const" : 0,
    }
};
