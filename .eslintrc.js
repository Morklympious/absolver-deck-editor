/* eslint-env node */

module.exports = {
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
        // //////// Possible Errors //////////

        // disallow trailing commas in object literals
        "comma-dangle"             : "off",
        // disallow assignment in conditional expressions
        "no-cond-assign"           : "error",
        // disallow use of console (off by default in the node environment)
        "no-console"               : "warn",
        // disallow use of constant expressions in conditions
        "no-constant-condition"    : "error",
        // disallow control characters in regular expressions
        "no-control-regex"         : "off",
        // disallow use of debugger
        "no-debugger"              : "warn",
        // disallow duplicated argument names
        "no-dupe-args"             : "error",
        // disallow duplicate keys when creating object literals
        "no-dupe-keys"             : "error",
        // disallow duplicated case labels in a switch statement
        "no-duplicate-case"        : "error",
        // disallow empty statements
        "no-empty"                 : "warn",
        // disallow the use of empty character classes in regular expressions
        "no-empty-character-class" : "warn",
        // disallow assigning to the exception in a catch block
        "no-ex-assign"             : "error",
        // disallow double-negation boolean casts in a boolean context
        "no-extra-boolean-cast"    : "warn",
        // disallow unnecessary parentheses
        "no-extra-parens"          : "off",
        // disallow unnecessary semicolons
        "no-extra-semi"            : "warn",
        // disallow overwriting functions written as function declarations
        "no-func-assign"           : "warn",
        // disallow function or variable declarations in nested blocks
        "no-inner-declarations"    : "off",
        // disallow invalid regular expression strings in the RegExp constructor
        "no-invalid-regexp"        : "error",
        // disallow irregular whitespace outside of strings and comments
        "no-irregular-whitespace"  : "warn",
        // disallow negation of the left operand of an in expression
        "no-negated-in-lhs"        : "warn",
        // disallow the use of object properties of the global object (Math and JSON) as functions
        "no-obj-calls"             : "off",
        // disallow multiple spaces in a regular expression literal
        "no-regex-spaces"          : "warn",
        // disallow sparse arrays
        "no-sparse-arrays"         : "warn",
        // disallow bugs caused by depending on ASI
        "no-unexpected-multiline"  : "error",
        // disallow unreachable statements after a return, throw, continue, or break statement
        "no-unreachable"           : "error",
        // disallow comparisons with the value NaN
        "use-isnan"                : "error",
        // Ensure JSDoc comments are valid
        "valid-jsdoc"              : "off",
        // Ensure that the results of typeof are compared against a valid string
        "valid-typeof"             : "error",

        // //////// Best Practices //////////

        // Enforces getter/setter pairs in objects
        "accessor-pairs"        : "off",
        // ensure that Array.prototype methods use a return
        "array-callback-return" : "warn",
        // treat var statements as if they were block scoped
        "block-scoped-var"      : "warn",
        // specify the maximum cyclomatic complexity allowed in a program
        complexity            : [ "warn", 15 ],
        // require return statements to either always or never specify values
        "consistent-return"     : "warn",
        // specify curly brace conventions for all control statements
        curly                 : "error",
        // require default case in switch statements
        "default-case"          : "warn",
        // enforces consistent newlines before or after dots
        "dot-location"          : [ "error", "property" ],
        // encourages use of dot notation whenever possible
        "dot-notation"          : "warn",
        // require the use of === and !==
        eqeqeq                : "warn",
        // make sure for-in loops have an if statement
        "guard-for-in"          : "off",
        // disallow the use of alert, confirm, and prompt
        "no-alert"              : "warn",
        // disallow use of arguments.caller or arguments.callee
        "no-caller"             : "error",
        // disallow declaring functions/vars inside case statements
        "no-case-declarations"  : "error",
        // disallow division operators explicitly at beginning of regular expression
        "no-div-regex"          : "warn",
        // disallow else after a return in an if
        "no-else-return"        : "error",
        // disallow use of empty functions
        "no-empty-function"     : "warn",
        // disallow use of empty destructuring patterns
        "no-empty-pattern"      : "warn",
        // disallow comparisons to null without a type-checking operator
        "no-eq-null"            : "off",
        // disallow use of eval()
        "no-eval"               : "error",
        // disallow adding to native types
        "no-extend-native"      : "error",
        // disallow unnecessary function binding
        "no-extra-bind"         : "warn",
        // disallow unnecessary labels
        "no-extra-label"        : "error",
        // disallow fallthrough of case statements
        "no-fallthrough"        : "warn",
        // disallow the use of leading or trailing decimal points in numeric literals
        "no-floating-decimal"   : "error",
        // disallow the type conversions with shorter notations
        "no-implicit-coercion"  : "warn",
        // disallow declarations that would implicitly be global
        "no-implicit-globals"   : "error",
        // disallow use of eval()-like methods
        "no-implied-eval"       : "error",
        // disallow this keywords outside of classes or class-like objects
        "no-invalid-this"       : "off",
        // disallow usage of __iterator__ property
        "no-iterator"           : "error",
        // disallow use of labeled statements
        "no-labels"             : "error",
        // disallow unnecessary nested blocks
        "no-lone-blocks"        : "warn",
        // disallow creation of functions within loops
        "no-loop-func"          : "warn",
        // disallow the use of magic numbers
        "no-magic-numbers"      : "off",
        // disallow use of multiple spaces
        "no-multi-spaces"       : [ "warn", {
            exceptions : {
                ArrayExpression      : true,
                AssignmentExpression : true,
                CallExpression       : true,
                LogicalExpression    : true,
                ObjectExpression     : true,
                Property             : true,
                SwitchCase           : true,
                VariableDeclarator   : true
            }
        }],
        // disallow use of multiline strings
        "no-multi-str"                 : "error",
        // disallow reassignments of native objects
        "no-native-reassign"           : "error",
        // disallow use of new operator when not part of the assignment or comparison
        "no-new"                       : "off",
        // disallow use of new operator for Function object
        "no-new-func"                  : "off",
        // disallows creating new instances of String, Number, and Boolean
        "no-new-wrappers"              : "error",
        // disallow use of octal literals
        "no-octal"                     : "error",
        // disallow use of octal escape sequences in string literals, such as var foo = "Copyright \"error"51";
        "no-octal-escape"              : "error",
        // disallow reassignment of function parameters
        "no-param-reassign"            : "off",
        // disallow usage of __proto__ property
        "no-proto"                     : "error",
        // disallow declaring the same variable more then once
        "no-redeclare"                 : "warn",
        // disallow use of assignment in return statement
        "no-return-assign"             : "warn",
        // disallow use of javascript: urls.
        "no-script-url"                : "error",
        // disallow comparisons where both sides are exactly the same
        "no-self-compare"              : "warn",
        // disallow use of comma operator
        "no-sequences"                 : "error",
        // restrict what can be thrown as an exception
        "no-throw-literal"             : "warn",
        // disallow unmodified conditions of loops
        "no-unmodified-loop-condition" : "error",
        // disallow usage of expressions in statement position
        "no-unused-expressions"        : "warn",
        // disallow unnecessary .call() and .apply()
        "no-useless-call"              : "warn",
        // disallow unnecessary concatenation of literals or template literals
        "no-useless-concat"            : "warn",
        // disallow use of void operator
        "no-void"                      : "error",
        // disallow usage of configurable warning terms in comments, e.g. TODO or FIXME
        "no-warning-comments"          : "off",
        // disallow use of the with statement
        "no-with"                      : "error",
        // require use of the second argument for parseInt()
        radix                        : "warn",
        // requires to declare all vars on top of their containing scope
        "vars-on-top"                  : "warn",
        // require immediate function invocation to be wrapped in parentheses
        "wrap-iife"                    : "warn",
        // require or disallow Yoda conditions
        yoda                         : "warn",

        // //////// Strict Mode //////////

        // controls location of Use Strict Directives
        strict : "off",

        // //////// Variables //////////

        // enforce or disallow variable initializations at definition
        "init-declarations"          : "off",
        // disallow the catch clause parameter name being the same as a variable in the outer scope (off by default in the node environment)
        "no-catch-shadow"            : "error",
        // disallow deletion of variables
        "no-delete-var"              : "error",
        // disallow labels that share a name with a variable
        "no-label-var"               : "error",
        // disallow declaration of variables already declared in the outer scope
        "no-shadow"                  : "warn",
        // disallow shadowing of names such as arguments
        "no-shadow-restricted-names" : "error",
        // disallow use of undeclared variables unless mentioned in a /*global */ block
        "no-undef"                   : "error",
        // disallow use of undefined when initializing variables
        "no-undef-init"              : "error",
        // disallow use of undefined variable
        "no-undefined"               : "off",
        // disallow declaration of variables that are not used in the code
        "no-unused-vars"             : [ "warn", {
            args               : "after-used",
            ignoreRestSiblings : true,
            caughtErrors       : "none"
        }],
        // disallow use of variables before they are defined
        "no-use-before-define" : "warn",

        // //////// Node.js //////////

        // enforce return after a callback
        "callback-return" : [ "error", [
            "callback",
            "cb",
            "next",
            "done"
        ]],
        // enforce require() on top-level module scope
        "global-require"        : "off",
        // enforces error handling in callbacks (on by default in the node environment)
        "handle-callback-err"   : "off",
        // disallow mixing regular variable and require declarations (on by default in the node environment)
        "no-mixed-requires"     : "off",
        // disallow use of new operator with the require function (on by default in the node environment)
        "no-new-require"        : "off",
        // disallow string concatenation with __dirname and __filename (on by default in the node environment)
        "no-path-concat"        : "off",
        // disallow use of process.env
        "no-process-env"        : "off",
        // disallow process.exit() (on by default in the node environment)
        "no-process-exit"       : "off",
        // restrict usage of specified node modules
        "no-restricted-modules" : "off",
        // disallow use of synchronous methods
        "no-sync"               : "off",

        // //////// Stylistic Issues //////////

        // enforce spacing inside array brackets (fixable)
        "array-bracket-spacing" : [ "warn",
            "always",
            {
                arraysInArrays  : false,
                singleValue     : true,
                objectsInArrays : false
            }
        ],
        // disallow or enforce spaces inside of single line blocks (fixable)"
        "block-spacing" : [ "warn", "always" ],
        // enforce one true brace style
        "brace-style"   : "error",
        // Require camel case names (except in properties)
        camelcase     : [ "warn", {
            properties : "never"
        }],
        // enforce spacing before and after comma
        "comma-spacing"             : "warn",
        // enforce one true comma style
        "comma-style"               : [ "warn", "last" ],
        // require or disallow padding inside computed properties (fixable)
        "computed-property-spacing" : "off",
        // enforces consistent naming when capturing the current execution context
        "consistent-this"           : [ "warn", "self" ],
        // enforce newline at the end of file, with no multiple empty lines
        "eol-last"                  : "error",
        // require function expressions to have a name
        "func-names"                : "off",
        // enforces use of function declarations or expressions
        "func-style"                : [ "warn", "declaration" ],
        // prevent certain names from being used
        "id-blacklist"              : "off",
        // limit identifiers to a min/max length
        "id-length"                 : "off",
        // Force identifiers to match a regex
        "id-match"                  : "off",
        // specify tab or space width for your code (fixable)
        // we use 4 spaces but eslint gets cranky about some things, so disabled
        indent                    : "off",
        // specify whether double or single quotes should be used in JSX attributes
        "jsx-quotes"                : "off",
        // enforces spacing between keys and values in object literal properties
        "key-spacing"               : [ "warn", {
            beforeColon : true,
            afterColon  : true,
            align       : "colon"
        }],
        // require spacing before most keywords (fixable)
        "keyword-spacing" : [ "warn", {
            before    : true,
            after     : false,
            overrides : {
                return : {
                    after : true
                },
                else : {
                    after : true
                },
                try : {
                    after : true
                },
                case : {
                    after : true
                },
                from : {
                    after : true
                },
                import : {
                    after : true
                },
                export : {
                    after : true
                }
            }
        }],
        // disallow mixed 'LF' and 'CRLF' as linebreaks
        "linebreak-style"      : "off",
        // enforce empty lines around comments
        "lines-around-comment" : [ "off", {
            beforeBlockComment : true,
            beforeLineComment  : true,
            allowBlockStart    : true,
            allowObjectStart   : true,
            allowArrayStart    : true
        }],
        // specify the maximum depth callbacks can be nested
        "max-nested-callbacks" : "off",
        // limit the number of params a method can take
        "max-params"           : [ "warn", 4 ],
        // limit the number of statements a method can contain
        "max-statements"       : [ "warn", 15, {
            ignoreTopLevelFunctions : true
        }],
        // require a capital letter for constructors
        "new-cap"                  : "warn",
        // disallow the omission of parentheses when invoking a constructor with no arguments
        "new-parens"               : "error",
        // require or disallow an empty newline after variable declarations
        "newline-after-var"        : "warn",
        // require or disallow an empty newline before a return statement
        "newline-before-return"    : "warn",
        // require or disallow a newline per chained call
        "newline-per-chained-call" : "warn",
        // disallow use of the Array constructor
        "no-array-constructor"     : "error",
        // disallow the usage of bitwise operators (|, &, <<, >>) as they're often an error
        "no-bitwise"               : "error",
        // disallow use of the continue statement
        "no-continue"              : "off",
        // disallow comments inline after code
        "no-inline-comments"       : "off",
        // disallow if as the only statement in an else block
        "no-lonely-if"             : "error",
        // disallow mixed spaces and tabs for indentation
        "no-mixed-spaces-and-tabs" : "error",
        // disallow multiple empty lines
        "no-multiple-empty-lines"  : "warn",
        // disallow negated conditions
        "no-negated-condition"     : "off",
        // disallow nested ternary expressions
        "no-nested-ternary"        : "error",
        // disallow use of the Object constructor
        "no-new-object"            : "error",
        // disallow use of ++ and --
        "no-plusplus"              : "off",
        // disallow use of certain syntax in code
        "no-restricted-syntax"     : [ "error",
            "WithStatement"
        ],
        // disallow space between function identifier and application
        "no-spaced-func"                : "warn",
        // disallow the use of ternary operators
        "no-ternary"                    : "off",
        // disallow trailing whitespace at the end of lines
        "no-trailing-spaces"            : "off",
        // disallow dangling underscores in identifiers
        "no-underscore-dangle"          : "off",
        // disallow the use of ternary operators when a simpler alternative exists
        "no-unneeded-ternary"           : "warn",
        // disallow whitespace before properties
        "no-whitespace-before-property" : "error",
        // require or disallow spaces inside object brackets
        "object-curly-spacing"          : [ "warn",
            "always",
            {
                objectsInObjects : true,
                arraysInObjects  : true
            }
        ],
        // allow just one var statement per function
        "one-var"                      : [ "error", {
            var   : "always",
            let   : "never",
            const : "never"
        } ],
        "one-var-declaration-per-line" : [ "warn",
            "initializations"
        ],
        // require assignment operator shorthand where possible or prohibit it entirely
        "operator-assignment" : "off",
        // enforce operators to be placed before or after line breaks
        "operator-linebreak"  : [ "warn", "after" ],
        // enforce padding within blocks
        "padded-blocks"       : [ "warn", "never" ],
        // require quotes around object literal property names
        "quote-props"         : [ "warn", "as-needed" ],
        // specify whether double or single quotes should be used
        quotes              : [ "error", "double", {
            avoidEscape           : true,
            allowTemplateLiterals : true
        }],
        // Require JSDoc comment
        "require-jsdoc" : "off",
        // require or disallow use of semicolons instead of ASI
        semi          : "error",
        // disallow space before/after semicolon
        "semi-spacing"  : [ "warn", {
            before : false,
            after  : true
        }],
        // sort variables within the same declaration block
        "sort-vars"                   : "off",
        // require or disallow space before blocks
        "space-before-blocks"         : [ "warn", "always" ],
        // require a space after function names
        "space-before-function-paren" : [ "warn", "never" ],
        // disallow spaces directly inside parentheses
        "space-in-parens"             : [ "warn", "never" ],
        // require spaces around operators
        "space-infix-ops"             : "error",
        // Require or disallow spaces before/after unary operators (words on by default, nonwords off by default)
        "space-unary-ops"             : "off",
        // require or disallow a space immediately following the // in a line comment
        "spaced-comment"              : [ "warn", "always" ],
        // require regex literals to be wrapped in parentheses
        "wrap-regex"                  : "off",
        
        // //////// ES6 //////////
        // Require curly braces around arrow bodies in most cases
        "arrow-body-style"       : [ "warn", "as-needed" ],
        // Require parentheses around arrow function params
        "arrow-parens"           : [ "error", "always" ],
        // Require spaces on both sides of the => in an arrow function
        "arrow-spacing"          : "error",
        "constructor-super"      : "error",
        "generator-star-spacing" : "error",
        "no-class-assign"        : "error",
        // disallow arrow functions that could be confused w/ comparisons
        "no-confusing-arrow"     : [
            "error",
            { allowParens : true }
        ],
        // disallow modifying const variables
        "no-const-assign"        : "error",
        "no-dupe-class-members"  : "error",
        "no-new-symbol"          : "error",
        "no-restricted-imports"  : "error",
        "no-this-before-super"   : "error",
        "no-useless-constructor" : "error",
        "no-var"                 : "off",
        "object-shorthand"       : "off",
        "prefer-arrow-callback"  : "off",
        "prefer-const"           : "off",
        "prefer-reflect"         : "off",
        "prefer-rest-params"     : "off",
        "prefer-spread"          : "off",
        "prefer-template"        : "warn",
        "require-yield"          : "error",
        // disallow spaces inside embedded expressions in template strings
        "template-curly-spacing" : "error",
        // disallow spaces between tagged template literal function and the template literal
        "template-tag-spacing"   : [ "error", "never" ],
        "yield-star-spacing"     : "error"
    }
};
