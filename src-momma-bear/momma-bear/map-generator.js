'use strict';

(function (root, factory) {
    const api = factory();

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }

    if (root) {
        root.MommaBearMapGenerator = api;
    }
}(typeof window !== 'undefined' ? window : null, function () {
    const DEFAULT_COLUMNS = 30;
    const DEFAULT_ROWS = 20;
    const DEFAULT_PLAYERS = 4;
    const STYLES = Object.freeze({
        pangaea: Object.freeze({ anchors: 6, landRatio: 0.61, minimumIsland: 4 }),
        continents: Object.freeze({ anchors: 7, landRatio: 0.55, minimumIsland: 3 }),
        archipelago: Object.freeze({
            anchors: 11,
            landRatio: 0.36,
            elevationLandRatio: 0.52,
            minimumIsland: 1
        })
    });

    function clamp(value, minimum, maximum) {
        return Math.max(minimum, Math.min(maximum, value));
    }

    function hashString(value) {
        const text = String(value);
        let hash = 2166136261;

        for (let index = 0; index < text.length; index += 1) {
            hash ^= text.charCodeAt(index);
            hash = Math.imul(hash, 16777619);
        }

        return hash >>> 0;
    }

    function mix32(value) {
        let mixed = value >>> 0;
        mixed ^= mixed >>> 16;
        mixed = Math.imul(mixed, 0x7feb352d);
        mixed ^= mixed >>> 15;
        mixed = Math.imul(mixed, 0x846ca68b);
        mixed ^= mixed >>> 16;
        return mixed >>> 0;
    }

    function createRandom(seed) {
        let state = hashString(seed);

        return function random() {
            state = (state + 0x6d2b79f5) >>> 0;
            let value = state;
            value = Math.imul(value ^ (value >>> 15), value | 1);
            value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
            return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
        };
    }

    function coordinateRandom(seed, x, y, salt) {
        const value = hashString(seed)
            ^ Math.imul(x + 1013, 374761393)
            ^ Math.imul(y + 1619, 668265263)
            ^ Math.imul(salt + 313, 2246822519);
        return mix32(value) / 4294967296;
    }

    function smooth(value) {
        return value * value * (3 - (2 * value));
    }

    function interpolate(from, to, amount) {
        return from + ((to - from) * amount);
    }

    function valueNoise(x, y, scale, seed, salt) {
        const scaledX = x / scale;
        const scaledY = y / scale;
        const x0 = Math.floor(scaledX);
        const y0 = Math.floor(scaledY);
        const tx = smooth(scaledX - x0);
        const ty = smooth(scaledY - y0);
        const top = interpolate(
            coordinateRandom(seed, x0, y0, salt),
            coordinateRandom(seed, x0 + 1, y0, salt),
            tx
        );
        const bottom = interpolate(
            coordinateRandom(seed, x0, y0 + 1, salt),
            coordinateRandom(seed, x0 + 1, y0 + 1, salt),
            tx
        );

        return interpolate(top, bottom, ty);
    }

    function fractalNoise(x, y, seed, salt) {
        const broad = valueNoise(x, y, 11, seed, salt);
        const medium = valueNoise(x, y, 5.5, seed, salt + 1);
        const detail = valueNoise(x, y, 2.75, seed, salt + 2);
        return ((broad * 4) + (medium * 2) + detail) / 7;
    }

    function offsetToAxial(tile) {
        return {
            q: tile.column - ((tile.row - (tile.row & 1)) / 2),
            r: tile.row
        };
    }

    function hexDistance(first, second) {
        const a = offsetToAxial(first);
        const b = offsetToAxial(second);
        const deltaQ = a.q - b.q;
        const deltaR = a.r - b.r;
        return (Math.abs(deltaQ) + Math.abs(deltaR) + Math.abs(deltaQ + deltaR)) / 2;
    }

    function neighborIndexes(column, row, columns, rows) {
        const evenOffsets = [[-1, 0], [1, 0], [-1, -1], [0, -1], [-1, 1], [0, 1]];
        const oddOffsets = [[-1, 0], [1, 0], [0, -1], [1, -1], [0, 1], [1, 1]];
        const offsets = row % 2 === 0 ? evenOffsets : oddOffsets;
        const neighbors = [];

        for (const offset of offsets) {
            const neighborColumn = column + offset[0];
            const neighborRow = row + offset[1];

            if (neighborColumn >= 0
                && neighborColumn < columns
                && neighborRow >= 0
                && neighborRow < rows) {
                neighbors.push((neighborRow * columns) + neighborColumn);
            }
        }

        return neighbors;
    }

    function createTiles(columns, rows) {
        const tiles = [];

        for (let row = 0; row < rows; row += 1) {
            for (let column = 0; column < columns; column += 1) {
                const index = (row * columns) + column;
                tiles.push({
                    index: index,
                    column: column,
                    row: row,
                    neighbors: neighborIndexes(column, row, columns, rows),
                    terrain: 'ocean',
                    elevation: 0,
                    filledElevation: 0,
                    temperature: 0,
                    moisture: 0,
                    accumulation: 0,
                    flowTo: null,
                    river: false,
                    continent: null,
                    resource: null,
                    start: null
                });
            }
        }

        return tiles;
    }

    function anchorPosition(style, index, count, columns, rows, random) {
        if (style === 'pangaea') {
            return {
                column: Math.round((columns * 0.5) + ((random() - 0.5) * columns * 0.42)),
                row: Math.round((rows * 0.5) + ((random() - 0.5) * rows * 0.48))
            };
        }

        if (style === 'continents') {
            const side = index % 2 === 0 ? 0.28 : 0.72;
            return {
                column: Math.round((columns * side) + ((random() - 0.5) * columns * 0.22)),
                row: Math.round(rows * (0.18 + (0.64 * ((index + random()) / count))))
            };
        }

        return {
            column: Math.round(columns * (0.12 + (random() * 0.76))),
            row: Math.round(rows * (0.12 + (random() * 0.76)))
        };
    }

    function buildElevation(tiles, columns, rows, seed, styleName) {
        const style = STYLES[styleName];
        const random = createRandom(`${seed}:anchors`);
        const anchors = [];

        for (let index = 0; index < style.anchors; index += 1) {
            const position = anchorPosition(styleName, index, style.anchors, columns, rows, random);
            const baseRadius = styleName === 'archipelago' ? 2.8 : 5.5;
            anchors.push({
                column: clamp(position.column, 2, columns - 3),
                row: clamp(position.row, 2, rows - 3),
                radius: baseRadius + (random() * (styleName === 'pangaea' ? 5.5 : 2.2)),
                strength: 0.78 + (random() * 0.32)
            });
        }

        const interior = [];

        for (const tile of tiles) {
            let macro = -Infinity;
            let anchorIndex = 0;

            anchors.forEach((anchor, index) => {
                const influence = anchor.strength - (hexDistance(tile, anchor) / anchor.radius);
                if (influence > macro) {
                    macro = influence;
                    anchorIndex = index;
                }
            });
            tile.anchor = anchorIndex;

            const noise = fractalNoise(tile.column, tile.row, seed, 17);
            const ridgeNoise = fractalNoise(tile.column, tile.row, seed, 53);
            const ridge = 1 - Math.abs((ridgeNoise * 2) - 1);
            const edgeDistance = Math.min(
                tile.column,
                columns - tile.column - 1,
                tile.row,
                rows - tile.row - 1
            );
            const edgePenalty = Math.max(0, (3 - edgeDistance) / 3) * 1.2;
            const continentalRift = styleName === 'continents'
                ? Math.max(0, 1 - (Math.abs((tile.column / (columns - 1)) - 0.5) * 8)) * 1.05
                : 0;

            tile.rawElevation = macro + (noise * 0.42) + (ridge * 0.13) - edgePenalty - continentalRift;

            if (edgeDistance > 0) {
                interior.push(tile.rawElevation);
            }
        }

        interior.sort((first, second) => first - second);
        const desiredLand = Math.min(
            interior.length - 1,
            Math.round(tiles.length * (style.elevationLandRatio || style.landRatio))
        );
        const threshold = interior[Math.max(0, interior.length - desiredLand)];
        const maximum = interior[interior.length - 1];

        for (const tile of tiles) {
            const border = tile.column === 0
                || tile.column === columns - 1
                || tile.row === 0
                || tile.row === rows - 1;
            const isLand = !border && tile.rawElevation >= threshold;
            tile.elevation = isLand
                ? 0.06 + (0.94 * Math.pow((tile.rawElevation - threshold) / (maximum - threshold), 0.72))
                : 0;
            tile.terrain = isLand ? 'grass' : 'ocean';
        }

        if (styleName === 'archipelago') {
            const boundaryTiles = tiles.filter((tile) => tile.terrain !== 'ocean'
                && tile.neighbors.some((neighborIndex) => tiles[neighborIndex].anchor !== tile.anchor));
            for (const tile of boundaryTiles) {
                tile.terrain = 'ocean';
                tile.elevation = 0;
            }
        }
    }

    function collectLandmasses(tiles) {
        const components = [];
        const visited = new Set();

        for (const tile of tiles) {
            if (tile.terrain === 'ocean' || visited.has(tile.index)) {
                continue;
            }

            const component = [];
            const queue = [tile.index];
            visited.add(tile.index);

            while (queue.length > 0) {
                const current = tiles[queue.shift()];
                component.push(current.index);

                for (const neighborIndex of current.neighbors) {
                    const neighbor = tiles[neighborIndex];
                    if (neighbor.terrain !== 'ocean' && !visited.has(neighborIndex)) {
                        visited.add(neighborIndex);
                        queue.push(neighborIndex);
                    }
                }
            }

            components.push(component);
        }

        return components.sort((first, second) => second.length - first.length);
    }

    function pruneIslands(tiles, minimumIsland) {
        for (const component of collectLandmasses(tiles)) {
            if (component.length >= minimumIsland) {
                continue;
            }

            for (const index of component) {
                tiles[index].terrain = 'ocean';
                tiles[index].elevation = 0;
            }
        }
    }

    function assignContinents(tiles) {
        const components = collectLandmasses(tiles);

        components.forEach((component, continent) => {
            for (const index of component) {
                tiles[index].continent = continent;
            }
        });

        return components;
    }

    function distanceFromOcean(tiles) {
        const distances = new Array(tiles.length).fill(Infinity);
        const queue = [];

        for (const tile of tiles) {
            if (tile.terrain === 'ocean') {
                distances[tile.index] = 0;
                queue.push(tile.index);
            }
        }

        let cursor = 0;
        while (cursor < queue.length) {
            const current = tiles[queue[cursor]];
            cursor += 1;

            for (const neighborIndex of current.neighbors) {
                if (distances[neighborIndex] > distances[current.index] + 1) {
                    distances[neighborIndex] = distances[current.index] + 1;
                    queue.push(neighborIndex);
                }
            }
        }

        return distances;
    }

    function assignClimate(tiles, rows, seed) {
        const oceanDistances = distanceFromOcean(tiles);
        const windMoisture = new Array(tiles.length).fill(0);

        for (const tile of tiles) {
            if (tile.terrain === 'ocean') {
                tile.temperature = 0;
                tile.moisture = 1;
                continue;
            }

            const latitude = Math.abs(((tile.row / (rows - 1)) * 2) - 1);
            const temperatureNoise = fractalNoise(tile.column, tile.row, seed, 101) - 0.5;
            const moistureNoise = fractalNoise(tile.column, tile.row, seed, 151) - 0.5;
            tile.temperature = clamp(
                1 - latitude - (tile.elevation * 0.48) + (temperatureNoise * 0.24),
                0,
                1
            );
            tile.moisture = clamp(
                0.88 - (oceanDistances[tile.index] * 0.105) - (tile.elevation * 0.18)
                    + (moistureNoise * 0.55),
                0,
                1
            );
        }

        for (let row = 0; row < rows; row += 1) {
            const latitude = Math.abs((row / (rows - 1)) - 0.5);
            const westToEast = latitude > 0.23;
            const rowTiles = tiles
                .filter((tile) => tile.row === row)
                .sort((first, second) => westToEast
                    ? first.column - second.column
                    : second.column - first.column);
            let airborneMoisture = 0.3;
            let previousElevation = 0;

            for (const tile of rowTiles) {
                if (tile.terrain === 'ocean') {
                    airborneMoisture = 0.96;
                    previousElevation = 0;
                    continue;
                }

                const uplift = Math.max(0, tile.elevation - previousElevation);
                const rainfall = clamp(
                    0.04 + (airborneMoisture * 0.22) + (uplift * 0.9),
                    0,
                    0.78
                );
                windMoisture[tile.index] = rainfall;
                airborneMoisture = clamp(
                    airborneMoisture - (rainfall * 0.52) - (tile.elevation * 0.018) + 0.018,
                    0.04,
                    0.96
                );
                previousElevation = tile.elevation;
            }
        }

        for (const tile of tiles) {
            if (tile.terrain !== 'ocean') {
                tile.moisture = clamp(
                    (tile.moisture * 0.68) + (windMoisture[tile.index] * 0.92),
                    0,
                    1
                );
            }
        }
    }

    class MinimumHeap {
        constructor() {
            this.items = [];
        }

        push(item) {
            this.items.push(item);
            let index = this.items.length - 1;

            while (index > 0) {
                const parent = Math.floor((index - 1) / 2);
                if (this.items[parent].priority <= item.priority) {
                    break;
                }
                this.items[index] = this.items[parent];
                index = parent;
            }

            this.items[index] = item;
        }

        pop() {
            if (this.items.length === 0) {
                return null;
            }

            const minimum = this.items[0];
            const final = this.items.pop();

            if (this.items.length > 0) {
                let index = 0;
                while (true) {
                    const left = (index * 2) + 1;
                    const right = left + 1;
                    if (left >= this.items.length) {
                        break;
                    }
                    const child = right < this.items.length
                        && this.items[right].priority < this.items[left].priority
                        ? right
                        : left;
                    if (this.items[child].priority >= final.priority) {
                        break;
                    }
                    this.items[index] = this.items[child];
                    index = child;
                }
                this.items[index] = final;
            }

            return minimum;
        }
    }

    function buildHydrology(tiles) {
        const heap = new MinimumHeap();
        const visited = new Array(tiles.length).fill(false);

        for (const tile of tiles) {
            tile.flowTo = null;
            tile.river = false;
            tile.accumulation = tile.terrain === 'ocean' ? 0 : 1 + (tile.moisture * 1.5);
            if (tile.terrain === 'ocean') {
                visited[tile.index] = true;
                tile.filledElevation = 0;
                heap.push({ index: tile.index, priority: 0 });
            }
        }

        while (heap.items.length > 0) {
            const currentEntry = heap.pop();
            const current = tiles[currentEntry.index];

            for (const neighborIndex of current.neighbors) {
                if (visited[neighborIndex]) {
                    continue;
                }

                const neighbor = tiles[neighborIndex];
                visited[neighborIndex] = true;
                neighbor.flowTo = current.index;
                neighbor.filledElevation = Math.max(neighbor.elevation, current.filledElevation + 0.0001);
                heap.push({ index: neighbor.index, priority: neighbor.filledElevation });
            }
        }

        const land = tiles
            .filter((tile) => tile.terrain !== 'ocean')
            .sort((first, second) => second.filledElevation - first.filledElevation);

        for (const tile of land) {
            if (tile.flowTo !== null) {
                tiles[tile.flowTo].accumulation += tile.accumulation;
            }
        }

        const desiredRiverTiles = Math.max(4, Math.round(land.length * 0.06));
        const riverTiles = land
            .filter((tile) => tile.flowTo !== null && tile.accumulation >= 2.5)
            .sort((first, second) => (second.accumulation - first.accumulation)
                || (second.filledElevation - first.filledElevation)
                || (first.index - second.index))
            .slice(0, desiredRiverTiles);
        const riverIndexes = new Set(riverTiles.map((tile) => tile.index));

        for (const tile of land) {
            tile.river = riverIndexes.has(tile.index);
            if (tile.river) {
                tile.moisture = clamp(tile.moisture + 0.2, 0, 1);
            }
        }
    }

    function cornerCoordinates(tile) {
        const originX = (tile.column * 4) + (tile.row % 2 === 1 ? 2 : 0);
        const originY = tile.row * 2;
        return [
            { x: originX + 2, y: originY },
            { x: originX + 4, y: originY + 1 },
            { x: originX + 4, y: originY + 3 },
            { x: originX + 2, y: originY + 4 },
            { x: originX, y: originY + 3 },
            { x: originX, y: originY + 1 }
        ];
    }

    function vertexKey(point) {
        return `${point.x},${point.y}`;
    }

    function boundaryKey(first, second) {
        return [vertexKey(first), vertexKey(second)].sort().join('|');
    }

    function buildBoundaryRivers(tiles) {
        const verticesByKey = new Map();
        const boundariesByKey = new Map();

        function getVertex(point) {
            const key = vertexKey(point);
            if (!verticesByKey.has(key)) {
                verticesByKey.set(key, {
                    key: key,
                    x: point.x,
                    y: point.y,
                    neighbors: new Set(),
                    incidentTiles: new Set(),
                    ocean: false,
                    elevation: 0,
                    filledElevation: 0,
                    accumulation: 0,
                    flowTo: null
                });
            }
            return verticesByKey.get(key);
        }

        for (const tile of tiles) {
            const corners = cornerCoordinates(tile);
            for (let index = 0; index < corners.length; index += 1) {
                const first = getVertex(corners[index]);
                const second = getVertex(corners[(index + 1) % corners.length]);
                const key = boundaryKey(first, second);

                first.incidentTiles.add(tile.index);
                second.incidentTiles.add(tile.index);
                first.neighbors.add(second.key);
                second.neighbors.add(first.key);

                if (!boundariesByKey.has(key)) {
                    boundariesByKey.set(key, {
                        first: first.key,
                        second: second.key,
                        incidentTiles: new Set()
                    });
                }
                boundariesByKey.get(key).incidentTiles.add(tile.index);
            }
        }

        const vertices = Array.from(verticesByKey.values());
        const vertexIndexByKey = new Map();
        vertices.forEach((vertex, index) => {
            vertex.index = index;
            vertexIndexByKey.set(vertex.key, index);
        });

        for (const vertex of vertices) {
            vertex.neighbors = Array.from(vertex.neighbors)
                .map((key) => vertexIndexByKey.get(key));
            const incidentTiles = Array.from(vertex.incidentTiles).map((index) => tiles[index]);
            const landTiles = incidentTiles.filter((tile) => tile.terrain !== 'ocean');
            vertex.ocean = incidentTiles.some((tile) => tile.terrain === 'ocean')
                || landTiles.length === 0;
            vertex.elevation = vertex.ocean
                ? 0
                : landTiles.reduce((sum, tile) => sum + tile.elevation, 0) / landTiles.length;
            vertex.moisture = landTiles.length === 0
                ? 0
                : landTiles.reduce((sum, tile) => sum + tile.moisture, 0) / landTiles.length;
            vertex.accumulation = vertex.ocean ? 0 : 1 + (vertex.moisture * 1.5);
        }

        const heap = new MinimumHeap();
        const visited = new Array(vertices.length).fill(false);
        for (const vertex of vertices) {
            if (vertex.ocean) {
                visited[vertex.index] = true;
                heap.push({ index: vertex.index, priority: 0 });
            }
        }

        while (heap.items.length > 0) {
            const currentEntry = heap.pop();
            const current = vertices[currentEntry.index];

            for (const neighborIndex of current.neighbors) {
                if (visited[neighborIndex]) {
                    continue;
                }

                const neighbor = vertices[neighborIndex];
                visited[neighborIndex] = true;
                neighbor.flowTo = current.index;
                neighbor.filledElevation = Math.max(
                    neighbor.elevation,
                    current.filledElevation + 0.0001
                );
                heap.push({ index: neighbor.index, priority: neighbor.filledElevation });
            }
        }

        const drainingVertices = vertices
            .filter((vertex) => !vertex.ocean)
            .sort((first, second) => second.filledElevation - first.filledElevation);
        for (const vertex of drainingVertices) {
            if (vertex.flowTo !== null) {
                vertices[vertex.flowTo].accumulation += vertex.accumulation;
            }
        }

        const landCount = tiles.filter((tile) => tile.terrain !== 'ocean').length;
        const desiredSegments = Math.max(4, Math.round(landCount * 0.06));
        const riverVertices = drainingVertices
            .filter((vertex) => vertex.flowTo !== null && vertex.accumulation >= 2.5)
            .sort((first, second) => (second.accumulation - first.accumulation)
                || (second.filledElevation - first.filledElevation)
                || (first.index - second.index))
            .slice(0, desiredSegments);
        const riverEdges = [];

        for (const vertex of riverVertices) {
            const downstream = vertices[vertex.flowTo];
            const boundary = boundariesByKey.get(boundaryKey(vertex, downstream));
            const adjacentTiles = boundary
                ? Array.from(boundary.incidentTiles)
                : [];

            for (const tileIndex of adjacentTiles) {
                if (tiles[tileIndex].terrain !== 'ocean') {
                    tiles[tileIndex].river = true;
                }
            }

            riverEdges.push({
                from: { x: vertex.x, y: vertex.y },
                to: { x: downstream.x, y: downstream.y },
                fromElevation: vertex.filledElevation,
                toElevation: downstream.filledElevation,
                accumulation: vertex.accumulation,
                adjacentTiles: adjacentTiles
            });
        }

        return riverEdges;
    }

    function assignTerrain(tiles) {
        for (const tile of tiles) {
            if (tile.terrain === 'ocean') {
                continue;
            }

            if (tile.elevation >= 0.79) {
                tile.terrain = 'mountain';
            } else if (tile.elevation >= 0.61) {
                tile.terrain = 'hills';
            } else if (tile.temperature < 0.2) {
                tile.terrain = 'wasteland';
            } else if (tile.moisture >= 0.78 && tile.elevation < 0.4) {
                tile.terrain = 'swamp';
            } else if (tile.moisture < 0.3 && tile.temperature > 0.38) {
                tile.terrain = 'desert';
            } else if (tile.moisture >= 0.56) {
                tile.terrain = 'forest';
            } else {
                tile.terrain = 'grass';
            }
        }
    }

    function tileYield(tile) {
        const yields = {
            grass: [3, 1],
            forest: [2, 2],
            swamp: [2, 0],
            desert: [0, 1],
            hills: [1, 3],
            wasteland: [0, 1]
        }[tile.terrain] || [0, 0];

        return {
            food: yields[0] + (tile.river ? 1 : 0),
            production: yields[1]
        };
    }

    function tilesWithin(tiles, center, radius) {
        return tiles.filter((tile) => hexDistance(center, tile) <= radius);
    }

    function scoreStart(tiles, tile) {
        let score = tile.river ? 4 : 0;
        let passable = 0;

        for (const nearby of tilesWithin(tiles, tile, 3)) {
            if (nearby.terrain === 'ocean' || nearby.terrain === 'mountain') {
                continue;
            }

            const distance = Math.max(1, hexDistance(tile, nearby));
            const yields = tileYield(nearby);
            score += ((yields.food * 1.25) + yields.production) / distance;
            passable += 1;
        }

        return score + (passable * 0.18);
    }

    function placeStarts(tiles, components, playerCount, styleName, seed) {
        const allowedContinents = styleName === 'pangaea'
            ? new Set([0])
            : new Set(components
                .map((component, index) => ({ index: index, size: component.length }))
                .filter((entry) => entry.size >= Math.max(18, tiles.length * 0.045))
                .slice(0, Math.max(2, playerCount))
                .map((entry) => entry.index));
        const candidates = tiles.filter((tile) => tile.terrain !== 'ocean'
            && tile.terrain !== 'mountain'
            && allowedContinents.has(tile.continent));
        for (const tile of candidates) {
            tile.startScore = scoreStart(tiles, tile);
        }
        candidates.sort((first, second) => second.startScore - first.startScore);

        let bestStarts = [];
        let bestCombinationScore = -Infinity;
        for (const anchor of candidates.slice(0, Math.min(60, candidates.length))) {
            const selected = [anchor];

            while (selected.length < playerCount) {
                let bestCandidate = null;
                let bestCandidateScore = -Infinity;

                for (const candidate of candidates) {
                    if (selected.includes(candidate)) {
                        continue;
                    }

                    const minimumDistance = Math.min(
                        ...selected.map((start) => hexDistance(candidate, start))
                    );
                    if (minimumDistance < 5) {
                        continue;
                    }

                    const score = (minimumDistance * 5)
                        - (Math.abs(candidate.startScore - anchor.startScore) * 1.8)
                        + (candidate.startScore * 0.05);
                    if (score > bestCandidateScore) {
                        bestCandidate = candidate;
                        bestCandidateScore = score;
                    }
                }

                if (!bestCandidate) {
                    break;
                }
                selected.push(bestCandidate);
            }

            if (selected.length !== playerCount) {
                continue;
            }

            const scores = selected.map((start) => start.startScore);
            const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
            const spread = (Math.max(...scores) - Math.min(...scores)) / average;
            let minimumDistance = Infinity;
            for (let first = 0; first < selected.length; first += 1) {
                for (let second = first + 1; second < selected.length; second += 1) {
                    minimumDistance = Math.min(
                        minimumDistance,
                        hexDistance(selected[first], selected[second])
                    );
                }
            }
            const continentCount = new Set(selected.map((start) => start.continent)).size;
            const combinationScore = (minimumDistance * 6)
                + (average * 0.12)
                + (continentCount * 4)
                - (spread * 95);

            if (combinationScore > bestCombinationScore) {
                bestCombinationScore = combinationScore;
                bestStarts = selected;
            }
        }

        bestStarts.forEach((start, index) => {
            start.start = index + 1;
        });
        return bestStarts;
    }

    function placeNearestResource(tiles, start, type, preferredTerrains, random) {
        const candidates = tilesWithin(tiles, start, 3)
            .filter((tile) => tile.index !== start.index
                && tile.terrain !== 'ocean'
                && tile.terrain !== 'mountain'
                && tile.resource === null
                && tile.start === null)
            .sort((first, second) => {
                const firstPreferred = preferredTerrains.includes(first.terrain) ? 1 : 0;
                const secondPreferred = preferredTerrains.includes(second.terrain) ? 1 : 0;
                if (firstPreferred !== secondPreferred) {
                    return secondPreferred - firstPreferred;
                }
                const distanceDifference = hexDistance(start, first) - hexDistance(start, second);
                return distanceDifference || (random() < 0.5 ? -1 : 1);
            });

        if (candidates.length > 0) {
            candidates[0].resource = type;
        }
    }

    function placeResources(tiles, starts, seed) {
        const random = createRandom(`${seed}:resources`);

        for (const start of starts) {
            placeNearestResource(tiles, start, 'food', ['grass', 'forest', 'swamp'], random);
            placeNearestResource(tiles, start, 'production', ['hills', 'forest'], random);
            placeNearestResource(tiles, start, 'strategic', ['hills', 'desert', 'wasteland'], random);
        }

        const globalResources = [];
        const resourcePlan = [
            ['luxury', Math.max(4, starts.length * 2)],
            ['strategic', Math.max(3, starts.length)],
            ['food', Math.max(4, starts.length)]
        ];

        for (const entry of resourcePlan) {
            const type = entry[0];
            for (let count = 0; count < entry[1]; count += 1) {
                let best = null;
                let bestScore = -Infinity;

                for (const candidate of tiles) {
                    if (candidate.terrain === 'ocean'
                        || candidate.terrain === 'mountain'
                        || candidate.resource !== null
                        || candidate.start !== null) {
                        continue;
                    }

                    const distanceFromSame = globalResources
                        .filter((resource) => resource.resource === type)
                        .reduce((minimum, resource) => Math.min(minimum, hexDistance(candidate, resource)), 20);
                    const distanceFromStart = starts
                        .reduce((minimum, start) => Math.min(minimum, hexDistance(candidate, start)), 20);
                    const score = (distanceFromSame * 2) + distanceFromStart + random();

                    if (score > bestScore) {
                        best = candidate;
                        bestScore = score;
                    }
                }

                if (best) {
                    best.resource = type;
                    globalResources.push(best);
                }
            }
        }
    }

    function summarize(tiles, components, starts, targetLandRatio, expectedPlayers) {
        const land = tiles.filter((tile) => tile.terrain !== 'ocean');
        const biomeCounts = {};

        for (const tile of land) {
            biomeCounts[tile.terrain] = (biomeCounts[tile.terrain] || 0) + 1;
        }

        let minimumStartDistance = 0;
        if (starts.length > 1) {
            minimumStartDistance = Infinity;
            for (let first = 0; first < starts.length; first += 1) {
                for (let second = first + 1; second < starts.length; second += 1) {
                    minimumStartDistance = Math.min(
                        minimumStartDistance,
                        hexDistance(starts[first], starts[second])
                    );
                }
            }
        }

        const startScores = starts.map((start) => start.startScore);
        const averageStartScore = startScores.length === 0
            ? 0
            : startScores.reduce((sum, score) => sum + score, 0) / startScores.length;
        const startScoreSpread = startScores.length === 0 || averageStartScore === 0
            ? 1
            : (Math.max(...startScores) - Math.min(...startScores)) / averageStartScore;
        const largestLandmassRatio = land.length === 0 || components.length === 0
            ? 0
            : components[0].length / land.length;
        const riverTiles = land.filter((tile) => tile.river).length;
        const landRatio = land.length / tiles.length;

        return {
            landRatio: landRatio,
            largestLandmassRatio: largestLandmassRatio,
            riverTiles: riverTiles,
            biomeCounts: biomeCounts,
            minimumStartDistance: minimumStartDistance,
            startScoreSpread: startScoreSpread,
            score: 100
                - (Math.abs(landRatio - targetLandRatio) * 180)
                + (Object.keys(biomeCounts).length * 3)
                + (Math.min(riverTiles, 20) * 0.8)
                + (minimumStartDistance * 2)
                - (startScoreSpread * 70)
                - (starts.length < expectedPlayers ? 1000 : 0)
        };
    }

    function generateCandidate(options, attempt) {
        const attemptSeed = `${options.seed}:candidate:${attempt}`;
        const tiles = createTiles(options.columns, options.rows);

        buildElevation(tiles, options.columns, options.rows, attemptSeed, options.style);
        pruneIslands(tiles, STYLES[options.style].minimumIsland);
        const components = assignContinents(tiles);
        assignClimate(tiles, options.rows, attemptSeed);
        buildHydrology(tiles);
        assignTerrain(tiles);
        for (const tile of tiles) {
            tile.river = false;
        }
        const riverEdges = buildBoundaryRivers(tiles);
        const starts = placeStarts(tiles, components, options.playerCount, options.style, attemptSeed);
        placeResources(tiles, starts, attemptSeed);
        const metrics = summarize(
            tiles,
            components,
            starts,
            STYLES[options.style].landRatio,
            options.playerCount
        );

        if (options.style === 'pangaea') {
            metrics.score += metrics.largestLandmassRatio * 35;
        } else if (options.style === 'continents') {
            metrics.score -= Math.abs(metrics.largestLandmassRatio - 0.52) * 110;
        } else {
            metrics.score -= Math.abs(metrics.largestLandmassRatio - 0.24) * 110;
        }

        return {
            seed: options.seed,
            style: options.style,
            playerCount: options.playerCount,
            columns: options.columns,
            rows: options.rows,
            attempt: attempt,
            tiles: tiles,
            riverEdges: riverEdges,
            starts: starts,
            metrics: metrics
        };
    }

    function generateWorld(settings) {
        const requested = settings || {};
        const style = STYLES[requested.style] ? requested.style : 'continents';
        const options = {
            seed: String(requested.seed === undefined ? 'momma-bear' : requested.seed),
            style: style,
            playerCount: clamp(Number(requested.playerCount) || DEFAULT_PLAYERS, 2, 8),
            columns: clamp(Number(requested.columns) || DEFAULT_COLUMNS, 12, 120),
            rows: clamp(Number(requested.rows) || DEFAULT_ROWS, 10, 80)
        };
        let best = null;

        for (let attempt = 0; attempt < 10; attempt += 1) {
            const candidate = generateCandidate(options, attempt);
            if (!best || candidate.metrics.score > best.metrics.score) {
                best = candidate;
            }
        }

        return best;
    }

    return Object.freeze({
        DEFAULT_COLUMNS: DEFAULT_COLUMNS,
        DEFAULT_ROWS: DEFAULT_ROWS,
        STYLES: STYLES,
        createRandom: createRandom,
        hexDistance: hexDistance,
        neighborIndexes: neighborIndexes,
        generateWorld: generateWorld
    });
}));
