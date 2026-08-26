'use strict';

const Assert = require('assert');
const FS = require('fs');
const Path = require('path');

const repositoryRoot = Path.resolve(__dirname, '..', '..');
const deprecatedPaths = [
    'build.js',
    'build',
    'error.log',
    'LICENSES.chromium.html',
    'node_modules',
    'src-engine',
    'src-examples',
    'src-ide',
    'src-momma-bear/momma-bear/config.json',
    'src-momma-bear/momma-bear/hooks_for_startup.js',
    'src-momma-bear/momma-bear/main.js',
    'src-momma-bear/momma-bear/main.ts',
    'src-momma-bear/momma-bear/src',
    'src-momma-bear/momma-bear/tsconfig.json',
    'yarn.lock'
];

for (const relativePath of deprecatedPaths) {
    Assert.strictEqual(
        FS.existsSync(Path.join(repositoryRoot, relativePath)),
        false,
        `deprecated Cozy artifact remains: ${relativePath}`
    );
}

console.log('deprecated Cozy artifacts absent: ok');
