const {MINIFY} = process.env;
const minified = MINIFY === 'true';
const outputFile = minified ? 'dist/mapbox-gl-draw.js' : 'dist/mapbox-gl-draw-unminified.js';

import replace from '@rollup/plugin-replace';
import buble from '@rollup/plugin-buble';
import {terser} from 'rollup-plugin-terser';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
// kt / image bundling을 위해 플러그인 추가
import image from '@rollup/plugin-image';

export default {
  input: ['index.js'],
  output: {
    name: 'MapboxDraw',
    file: outputFile,
    format: 'esm', // kt / playground(ESModule)에서 사용하기 위해 ESM으로 번들링
    sourcemap: true,
    indent: false
  },
  treeshake: true,
  plugins: [
    replace({
      'process.env.NODE_ENV': "'browser'",
      preventAssignment: true
    }),
    buble({transforms: {dangerousForOf: true}, objectAssign: "Object.assign"}),
    minified ? terser() : false,
    resolve({
      browser: true,
      preferBuiltins: true
    }),
    commonjs({
      // global keyword handling causes Webpack compatibility issues, so we disabled it:
      // https://github.com/mapbox/mapbox-gl-js/pull/6956
      ignoreGlobal: true
    }),
    image() // kt / image bundling을 위해 플러그인 추가
  ],
};
