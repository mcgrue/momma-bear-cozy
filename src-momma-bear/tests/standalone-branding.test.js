'use strict';

const Assert = require('assert');
const FS = require('fs');
const Path = require('path');

const repositoryRoot = Path.resolve(__dirname, '..', '..');
const publicFiles = [
    'package.json',
    'readme.md',
    'src-momma-bear/package.json',
    'src-momma-bear/README.md',
    'src-momma-bear/momma-bear/index.html',
    'src-momma-bear/momma-bear/standalone.css',
    'src-momma-bear/momma-bear/standalone.js'
];

for (const relativePath of publicFiles) {
    const content = FS.readFileSync(Path.join(repositoryRoot, relativePath), 'utf8');
    Assert.doesNotMatch(
        content,
        /\b(?:cozy|electron)\b/i,
        `deprecated shell branding remains in ${relativePath}`
    );
}

console.log('standalone branding contract: ok');
