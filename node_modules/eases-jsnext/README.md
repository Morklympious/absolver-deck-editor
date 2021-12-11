# eases-jsnext

This is a fork of [mattdesl/eases](https://github.com/mattdesl/eases). It includes [tree-shaking-friendly ES6 modules](http://rollupjs.org), and a UMD build for [use in browser](http://jsfiddle.net/2cpy2zqm/).

It preserves the original individual CommonJS files, and therefore serves as a drop-in replacement.

---

# eases

[![stable](http://badges.github.io/stability-badges/dist/stable.svg)](http://github.com/badges/stability-badges)

This is a grab-bag of [Robert Penner's easing equations](http://www.robertpenner.com/easing/), most of the code from [glsl-easings](https://www.npmjs.org/package/glsl-easings). Pull requests for optimizations are welcome.

```js
//require all eases
import * as eases from 'eases-jsnext';

//require only the single function
import { quadIn } from 'eases-jsnext';
```

## Usage

[![NPM](https://nodei.co/npm/eases.png)](https://nodei.co/npm/eases/)

Full list of eases:

```js
import {
  backInOut,
  backIn,
  backOut,
  bounceInOut,
  bounceIn,
  bounceOut,
  circInOut,
  circIn,
  circOut,
  cubicInOut,
  cubicIn,
  cubicOut,
  elasticInOut,
  elasticIn,
  elasticOut,
  expoInOut,
  expoIn,
  expoOut,
  linear,
  quadInOut,
  quadIn,
  quadOut,
  quartInOut,
  quartIn,
  quartOut,
  quintInOut,
  quintIn,
  quintOut,
  sineInOut,
  sineIn,
  sineOut
} from 'eases-jsnext';
```

All easing functions only remap a time value, and all have the same signature.

#### ```v = ease(t)```

Where `t` is typically a value between 0 and 1, and it returns a new float that has been eased.

## License

MIT, see [LICENSE.md](http://github.com/mattdesl/eases/blob/master/LICENSE.md) for details.
