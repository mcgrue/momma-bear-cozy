'use strict';

const assert = require('assert');
const Path = require('path');

const game = require(Path.join(__dirname, '..', 'momma-bear', 'standalone.js'));

function worldFingerprint(world) {
    return JSON.stringify(world.tiles.map((tile) => ({
        terrain: tile.terrain,
        elevation: tile.elevation,
        river: tile.river,
        flowTo: tile.flowTo,
        resource: tile.resource,
        start: tile.start
    })));
}

function resourcesNear(world, start, radius) {
    return new Set(world.tiles
        .filter((tile) => game.hexDistance(start, tile) <= radius)
        .map((tile) => tile.resource)
        .filter(Boolean));
}

function testSeededGeneration() {
    const first = game.generateWorld({ seed: 'ursa-major', style: 'continents', playerCount: 4 });
    const replay = game.generateWorld({ seed: 'ursa-major', style: 'continents', playerCount: 4 });
    const alternate = game.generateWorld({ seed: 'ursa-minor', style: 'continents', playerCount: 4 });

    assert.strictEqual(worldFingerprint(first), worldFingerprint(replay));
    assert.notStrictEqual(worldFingerprint(first), worldFingerprint(alternate));
    assert.strictEqual(first.seed, 'ursa-major');
    assert.strictEqual(first.style, 'continents');
}

function testGeographyContract() {
    const world = game.generateWorld({ seed: 'watershed', style: 'continents', playerCount: 4 });
    const land = world.tiles.filter((tile) => tile.terrain !== 'ocean');
    const terrainTypes = new Set(land.map((tile) => tile.terrain));
    const rivers = land.filter((tile) => tile.river);

    assert.strictEqual(world.tiles.length, game.MAP_COLUMNS * game.MAP_ROWS);
    assert.ok(world.metrics.landRatio >= 0.45 && world.metrics.landRatio <= 0.65);
    assert.ok(world.metrics.largestLandmassRatio >= 0.35);
    assert.ok(terrainTypes.size >= 4);
    assert.ok(rivers.length >= 3);

    for (const tile of world.tiles) {
        const border = tile.column === 0
            || tile.column === game.MAP_COLUMNS - 1
            || tile.row === 0
            || tile.row === game.MAP_ROWS - 1;

        if (border) {
            assert.strictEqual(tile.terrain, 'ocean');
        }
    }

    for (const tile of rivers) {
        const downstream = world.tiles[tile.flowTo];
        assert.ok(downstream, `river tile ${tile.index} must drain somewhere`);
        assert.ok(
            downstream.terrain === 'ocean' || downstream.filledElevation < tile.filledElevation,
            `river tile ${tile.index} must flow downhill`
        );
    }
}

function testGameplayPlacement() {
    const world = game.generateWorld({ seed: 'fair-bear', style: 'pangaea', playerCount: 4 });

    assert.strictEqual(world.starts.length, 4);
    assert.ok(world.metrics.minimumStartDistance >= 5);

    for (const start of world.starts) {
        assert.notStrictEqual(start.terrain, 'ocean');
        assert.notStrictEqual(start.terrain, 'mountain');

        const nearby = resourcesNear(world, start, 3);
        assert.ok(nearby.has('food'), `start ${start.start} needs food`);
        assert.ok(nearby.has('production'), `start ${start.start} needs production`);
        assert.ok(nearby.has('strategic'), `start ${start.start} needs a strategic resource`);
    }
}

testSeededGeneration();
testGeographyContract();
testGameplayPlacement();

console.log('seeded 4X map generation: ok');
