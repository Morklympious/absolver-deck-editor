const fs = require( 'fs' );
const path = require( 'path' );
const rollup = require( 'rollup' );

const pkg = require( '../package.json' );

const modules = fs.readdirSync( 'src' ).filter( function ( file ) {
	return path.extname( file ) === '.js';
});

// for each file, generated a CommonJS module in the
// root directory, so people can do things like
// const bounceOut = require( 'eases/bounce-out' )
const lib = modules.reduce( function ( promise, module ) {
	return promise.then( function () {
		return rollup.rollup({ entry: 'src/' + module })
			.then( function ( bundle ) {
				return bundle.write({
					dest: module,
					format: 'cjs',
					useStrict: false
				});
			});
	});
}, { then: function ( fn ) { return fn(); } });

// generate a UMD build and an ES6 build containing
// the whole library
lib.then( function () {
	rollup.rollup({ entry: 'src/index.js' })
		.then( function ( bundle ) {
			bundle.write({
				dest: pkg.main,
				format: 'umd',
				moduleName: 'eases'
			});

			bundle.write({
				dest: pkg.module,
				format: 'es'
			});
		});
});
