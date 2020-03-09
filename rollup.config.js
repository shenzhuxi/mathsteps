import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';

export default {    
    input: 'index.js',
    output: {
        format: 'umd',
        name: 'mathsteps',
        exports: 'named', /** Disable warning for default imports */
        file: 'build/bundle.js',
    },
    plugins: [
        resolve(),
        commonjs()
    ]
};
