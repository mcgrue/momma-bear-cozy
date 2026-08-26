'use strict';

const Assert = require('assert');
const FS = require('fs');
const Path = require('path');

const repositoryRoot = Path.resolve(__dirname, '..', '..');
const packageJson = JSON.parse(
    FS.readFileSync(Path.join(repositoryRoot, 'package.json'), 'utf8')
);

Assert.strictEqual(packageJson.name, 'momma-bear-demo');
Assert.strictEqual(packageJson.productName, 'Momma Bear');
Assert.strictEqual(packageJson.private, true);
Assert.deepStrictEqual(packageJson.dependencies, undefined);

Assert.deepStrictEqual(packageJson.scripts, {
    start: 'npm --prefix src-momma-bear start',
    build: 'npm --prefix src-momma-bear run build',
    test: 'npm --prefix src-momma-bear test'
});

console.log('root package standalone contract: ok');
