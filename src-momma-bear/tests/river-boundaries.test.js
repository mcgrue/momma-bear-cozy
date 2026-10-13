'use strict';

const assert = require('assert');
const Path = require('path');

const game = require(Path.join(__dirname, '..', 'momma-bear', 'standalone.js'));

function pointKey(point) {
    return `${point.x},${point.y}`;
}

function edgeKey(first, second) {
    return [pointKey(first), pointKey(second)].sort().join('|');
}

function tileCorners(tile) {
    const originX = (tile.column * 4) + (tile.row % 2 === 1 ? 2 : 0);
    const originY = tile.row * 3;
    return [
        { x: originX + 2, y: originY + 2 },
        { x: originX + 4, y: originY + 3 },
        { x: originX + 4, y: originY + 5 },
        { x: originX + 2, y: originY + 6 },
        { x: originX, y: originY + 5 },
        { x: originX, y: originY + 3 }
    ];
}

const world = game.generateWorld({
    seed: 'momma-bear',
    style: 'continents',
    playerCount: 4
});
const hexBoundaryEdges = new Set();

for (const tile of world.tiles) {
    const corners = tileCorners(tile);
    for (let index = 0; index < corners.length; index += 1) {
        hexBoundaryEdges.add(edgeKey(corners[index], corners[(index + 1) % corners.length]));
    }
}

assert.ok(Array.isArray(world.riverEdges));
assert.ok(world.riverEdges.length >= 3);

for (const river of world.riverEdges) {
    assert.ok(
        hexBoundaryEdges.has(edgeKey(river.from, river.to)),
        `river ${edgeKey(river.from, river.to)} must occupy a hex boundary`
    );
    assert.ok(river.toElevation < river.fromElevation, 'river edges must drain downhill');
}

console.log('river boundary alignment: ok');
