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

    plugins: ["eslint-plugin-html"],
    
    globals : {
        "UIDelegate": true
    },

    rules : {
    }
};
