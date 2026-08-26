'use strict';

const assert = require('assert');
const Path = require('path');

const game = require(Path.join(__dirname, '..', 'momma-bear', 'standalone.js'));

function testTilePositions() {
    assert.deepStrictEqual(game.tilePosition(0, 0), { x: 0, y: 0 });
    assert.deepStrictEqual(game.tilePosition(1, 0), { x: 256, y: 0 });
    assert.deepStrictEqual(game.tilePosition(0, 1), { x: 128, y: 192 });
    assert.deepStrictEqual(game.tilePosition(29, 19), { x: 7552, y: 3648 });
}

function testFrameSlicing() {
    assert.deepStrictEqual(game.frameSource(0), { x: 0, y: 0 });
    assert.deepStrictEqual(game.frameSource(7), { x: 1792, y: 0 });
    assert.deepStrictEqual(game.frameSource(8), { x: 0, y: 384 });
    assert.deepStrictEqual(game.frameSource(35), { x: 768, y: 1536 });
}

function testMapContract() {
    const map = game.createMap(() => 0);
    const oceanFrames = new Set([4, 5, 6, 7]);
    const interiorFrames = new Set(game.WEIGHTED_TILE_FRAMES);
    let borderCount = 0;

    assert.strictEqual(map.length, 30 * 20);

    for (const tile of map) {
        const border = tile.column === 0 || tile.column === 29 || tile.row === 0 || tile.row === 19;
        const expectedPosition = game.tilePosition(tile.column, tile.row);

        assert.strictEqual(tile.x, expectedPosition.x);
        assert.strictEqual(tile.y, expectedPosition.y);

        if (border) {
            borderCount += 1;
            assert.ok(oceanFrames.has(tile.frame), `border frame ${tile.frame} must be ocean`);
        } else {
            assert.ok(interiorFrames.has(tile.frame), `interior frame ${tile.frame} must be weighted`);
        }
    }

    assert.strictEqual(borderCount, 96);
    assert.strictEqual(game.pickFrame(game.OCEAN_FRAMES, () => 0.999999), 7);
    assert.strictEqual(game.pickFrame(game.WEIGHTED_TILE_FRAMES, () => 0.999999), 35);
}

testTilePositions();
testFrameSlicing();
testMapContract();

console.log('standalone map regression: ok');
