'use strict';

const assert = require('assert');
const Path = require('path');

const game = require(Path.join(__dirname, '..', 'momma-bear', 'standalone.js'));

const worlds = {
    pangaea: game.generateWorld({ seed: 'style-contract', style: 'pangaea', playerCount: 4 }),
    continents: game.generateWorld({ seed: 'style-contract', style: 'continents', playerCount: 4 }),
    archipelago: game.generateWorld({ seed: 'style-contract', style: 'archipelago', playerCount: 4 })
};

assert.ok(worlds.pangaea.metrics.largestLandmassRatio >= 0.9);
assert.ok(worlds.continents.metrics.largestLandmassRatio >= 0.4);
assert.ok(worlds.continents.metrics.largestLandmassRatio <= 0.65);
assert.ok(worlds.archipelago.metrics.largestLandmassRatio < 0.4);
assert.ok(worlds.archipelago.metrics.landRatio >= 0.25);
assert.ok(worlds.archipelago.metrics.landRatio <= 0.4);

for (const world of Object.values(worlds)) {
    assert.strictEqual(world.starts.length, 4);
    assert.ok(world.metrics.startScoreSpread <= 0.15);
    assert.ok(world.metrics.riverTiles >= 3);
}

console.log('4X map style contracts: ok');
