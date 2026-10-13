'use strict';

(function (root, factory) {
    const mapGenerator = typeof module === 'object' && module.exports
        ? require('./map-generator.js')
        : root.MommaBearMapGenerator;
    const tileManager = typeof module === 'object' && module.exports
        ? require('./tile-manager.js')
        : root.TileManager;
    const api = factory(mapGenerator, tileManager);

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }

    if (root) {
        root.MommaBear = api;
    }
}(typeof window !== 'undefined' ? window : null, function (MapGenerator, TileManager) {
    if (!MapGenerator) {
        throw new Error('Momma Bear map generator failed to load.');
    }
    if (!TileManager) {
        throw new Error('Momma Bear tile manager failed to load.');
    }

    const MAP_COLUMNS = MapGenerator.DEFAULT_COLUMNS;
    const MAP_ROWS = MapGenerator.DEFAULT_ROWS;
    const TILE_WIDTH = 256;
    const TILE_HEIGHT = 384;
    const TILE_ROW_STEP = 192;
    const TILESET_COLUMNS = 8;
    const BACKGROUND = '#880088';
    const MIN_ZOOM = 0.25;
    const MAX_ZOOM = 3;
    const ZOOM_SENSITIVITY = 0.0015;
    const MAP_WIDTH = (MAP_COLUMNS * TILE_WIDTH) + (MAP_ROWS > 1 ? TILE_WIDTH / 2 : 0);
    const MAP_HEIGHT = ((MAP_ROWS - 1) * TILE_ROW_STEP) + TILE_HEIGHT;
    const DIRT_TOWN_TERRAINS = Object.freeze(['desert', 'hills', 'wasteland']);

    const OCEAN_FRAMES = Object.freeze([4, 5, 6, 7]);
    const TERRAIN_FRAMES = Object.freeze({
        grass: Object.freeze([0, 1, 2, 3]),
        ocean: OCEAN_FRAMES,
        mountain: Object.freeze([8, 9, 10, 11]),
        desert: Object.freeze([12, 13, 14, 15]),
        forest: Object.freeze([16, 17, 18, 19]),
        swamp: Object.freeze([20, 21, 22, 23]),
        wasteland: Object.freeze([24, 25, 26, 27]),
        hills: Object.freeze([32, 33, 34, 35])
    });
    const RESOURCE_COLORS = Object.freeze({
        food: '#8fd36b',
        production: '#d78a55',
        strategic: '#a8b7c8',
        luxury: '#d79cff'
    });
    const WEIGHTED_TILE_FRAMES = Object.freeze([
        4, 5, 6, 7,
        4, 5, 6, 7,
        4, 5, 6, 7,
        4, 5, 6, 7,
        4, 5, 6, 7,
        4, 5, 6, 7,
        4, 5, 6, 7,
        4, 5, 6, 7,
        4, 5, 6, 7,
        4, 5, 6, 7,
        4, 5, 6, 7,
        4, 5, 6, 7,
        4, 5, 6, 7,
        4, 5, 6, 7,
        4, 5, 6, 7,
        4, 5, 6, 7,
        4, 5, 6, 7,
        4, 5, 6, 7,
        0, 1, 2, 3,
        0, 1, 2, 3,
        0, 1, 2, 3,
        0, 1, 2, 3,
        8, 9, 10, 11,
        12, 13, 14, 15,
        16, 17, 18, 19,
        16, 17, 18, 19,
        16, 17, 18, 19,
        20, 21, 22, 23,
        24, 25, 26, 27,
        32, 33, 34, 35,
        32, 33, 34, 35
    ]);

    function pickFrame(frames, random) {
        const randomValue = (random || Math.random)();
        return frames[Math.floor(randomValue * frames.length)];
    }

    function tilePosition(column, row) {
        return {
            x: (column * TILE_WIDTH) + (row % 2 === 1 ? TILE_WIDTH / 2 : 0),
            y: row * TILE_ROW_STEP
        };
    }

    function frameSource(frame) {
        return {
            x: (frame % TILESET_COLUMNS) * TILE_WIDTH,
            y: Math.floor(frame / TILESET_COLUMNS) * TILE_HEIGHT
        };
    }

    function generateWorld(options) {
        const world = MapGenerator.generateWorld(options);
        const visualRandom = MapGenerator.createRandom(`${world.seed}:frames:${world.attempt}`);

        for (const tile of world.tiles) {
            const position = tilePosition(tile.column, tile.row);
            tile.x = position.x;
            tile.y = position.y;
            tile.frame = pickFrame(TERRAIN_FRAMES[tile.terrain], visualRandom);
        }

        return world;
    }

    function createMap(options) {
        const settings = typeof options === 'function'
            ? { seed: Math.floor(options() * 4294967296) }
            : options;
        return generateWorld(settings).tiles;
    }

    function freshSeed() {
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            const values = new Uint32Array(2);
            crypto.getRandomValues(values);
            return `${values[0].toString(36)}-${values[1].toString(36)}`;
        }

        return `${Date.now().toString(36)}-${Math.floor(Math.random() * 0xffffffff).toString(36)}`;
    }

    function mount(options) {
        const settings = options || {};
        const canvas = settings.canvas || document.querySelector('[data-momma-bear-canvas]');
        const loading = settings.loading || document.querySelector('[data-momma-bear-loading]');
        const reset = settings.reset || document.querySelector('[data-momma-bear-reset]');
        const generatorForm = settings.generatorForm
            || document.querySelector('[data-momma-bear-generator]');
        const seedInput = settings.seedInput || document.querySelector('[data-momma-bear-seed]');
        const styleInput = settings.styleInput || document.querySelector('[data-momma-bear-style]');
        const shuffle = settings.shuffle || document.querySelector('[data-momma-bear-shuffle]');
        const stats = settings.stats || document.querySelector('[data-momma-bear-stats]');
        const resourceTooltip = settings.resourceTooltip
            || document.querySelector('[data-momma-bear-resource-tooltip]');

        if (!canvas) {
            throw new Error('Momma Bear needs a canvas with data-momma-bear-canvas.');
        }

        const context = canvas.getContext('2d', { alpha: false });
        if (!context) {
            throw new Error('This browser does not provide a 2D canvas context.');
        }

        const query = typeof URLSearchParams === 'function'
            ? new URLSearchParams(window.location.search)
            : null;
        const initialSeed = String(settings.seed
            || (query && query.get('seed'))
            || (seedInput && seedInput.value)
            || 'momma-bear');
        const requestedStyle = settings.style
            || (query && query.get('style'))
            || (styleInput && styleInput.value)
            || 'continents';
        const initialStyle = MapGenerator.STYLES[requestedStyle] ? requestedStyle : 'continents';
        const initialWorld = generateWorld({
            seed: initialSeed,
            style: initialStyle,
            playerCount: settings.playerCount || 4
        });
        const state = {
            dragging: false,
            pointerId: null,
            lastX: 0,
            lastY: 0,
            offsetX: 0,
            offsetY: 0,
            zoom: 1,
            viewportWidth: 0,
            viewportHeight: 0,
            world: initialWorld,
            tiles: initialWorld.tiles,
            tileset: new Image(),
            ready: false
        };

        function tileCenter(tile) {
            return {
                x: ((tile.x + (TILE_WIDTH / 2)) * state.zoom) + state.offsetX,
                y: ((tile.y + (TILE_HEIGHT / 2)) * state.zoom) + state.offsetY
            };
        }

        function resourceMarker(tile) {
            const center = tileCenter(tile);
            return {
                x: center.x + (58 * state.zoom),
                y: center.y + (22 * state.zoom),
                size: 72 * state.zoom
            };
        }

        function startTownKey(tile) {
            if (tile.start !== 1 && tile.start !== 2) {
                return null;
            }

            const terrainStyle = DIRT_TOWN_TERRAINS.includes(tile.terrain) ? 'dirt' : 'plains';
            return TileManager.startTownTiles[terrainStyle][tile.start - 1];
        }

        function hideResourceTooltip() {
            canvas.classList.remove('has-resource-hover');
            if (resourceTooltip) {
                resourceTooltip.hidden = true;
            }
        }

        function updateResourceTooltip(event) {
            if (!resourceTooltip || state.dragging) {
                hideResourceTooltip();
                return;
            }

            const bounds = canvas.getBoundingClientRect();
            const pointerX = event.clientX - bounds.left;
            const pointerY = event.clientY - bounds.top;
            let hoveredTile = null;
            let hoveredName = null;

            for (let index = state.tiles.length - 1; index >= 0; index -= 1) {
                const tile = state.tiles[index];
                if (!tile.resource) {
                    continue;
                }

                const marker = resourceMarker(tile);
                const hitRadius = Math.max(18, marker.size / 2);
                if (Math.abs(pointerX - marker.x) <= hitRadius
                    && Math.abs(pointerY - marker.y) <= hitRadius) {
                    hoveredTile = tile;
                    break;
                }
            }

            if (hoveredTile) {
                const resourceKey = TileManager.resourceTiles[hoveredTile.resource];
                hoveredName = TileManager.get(resourceKey).name;
            } else {
                for (let index = state.tiles.length - 1; index >= 0; index -= 1) {
                    const tile = state.tiles[index];
                    const townKey = startTownKey(tile);
                    if (!townKey) {
                        continue;
                    }

                    const left = (tile.x * state.zoom) + state.offsetX;
                    const top = (tile.y * state.zoom) + state.offsetY;
                    if (pointerX >= left
                        && pointerX <= left + (TILE_WIDTH * state.zoom)
                        && pointerY >= top
                        && pointerY <= top + (TILE_HEIGHT * state.zoom)) {
                        hoveredName = TileManager.towns[townKey].name;
                        break;
                    }
                }
            }

            if (!hoveredName) {
                hideResourceTooltip();
                return;
            }

            resourceTooltip.textContent = hoveredName;
            resourceTooltip.hidden = false;
            canvas.classList.add('has-resource-hover');

            const gap = 14;
            const edgePadding = 10;
            const left = Math.max(edgePadding, Math.min(event.clientX + gap,
                window.innerWidth - resourceTooltip.offsetWidth - edgePadding));
            const top = Math.max(edgePadding, Math.min(event.clientY + gap,
                window.innerHeight - resourceTooltip.offsetHeight - edgePadding));
            resourceTooltip.style.left = `${left}px`;
            resourceTooltip.style.top = `${top}px`;
        }

        function drawRivers() {
            context.save();
            context.lineCap = 'round';
            context.lineJoin = 'round';
            context.strokeStyle = '#65c9e8';
            context.shadowColor = 'rgb(10 66 102 / 70%)';
            context.shadowBlur = 5 * state.zoom;

            for (const river of state.world.riverEdges) {
                const from = {
                    x: (river.from.x * TILE_WIDTH / 4 * state.zoom) + state.offsetX,
                    y: (river.from.y * TILE_ROW_STEP / 2 * state.zoom) + state.offsetY
                };
                const to = {
                    x: (river.to.x * TILE_WIDTH / 4 * state.zoom) + state.offsetX,
                    y: ((river.to.y * TILE_ROW_STEP / 2) * state.zoom) + state.offsetY
                };
                context.lineWidth = Math.min(13, 4 + Math.log2(river.accumulation)) * state.zoom;
                context.beginPath();
                context.moveTo(from.x, from.y);
                context.lineTo(to.x, to.y);
                context.stroke();
            }

            context.restore();
        }

        function drawStartTowns() {
            for (const tile of state.tiles) {
                if (tile.start !== 1 && tile.start !== 2) {
                    continue;
                }

                const townKey = startTownKey(tile);
                TileManager.drawTown(context, townKey,
                    Math.floor((tile.x * state.zoom) + state.offsetX),
                    Math.floor((tile.y * state.zoom) + state.offsetY),
                    TILE_WIDTH * state.zoom,
                    TILE_HEIGHT * state.zoom);
            }
        }

        function drawMapMarkers() {
            context.save();
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.font = `800 ${18 * state.zoom}px ui-sans-serif, system-ui, sans-serif`;

            for (const tile of state.tiles) {
                const center = tileCenter(tile);

                if (tile.resource) {
                    const marker = resourceMarker(tile);
                    const resourceKey = TileManager.resourceTiles[tile.resource];

                    context.save();
                    context.shadowColor = 'rgb(10 6 18 / 80%)';
                    context.shadowBlur = 8 * state.zoom;
                    const spriteDrawn = resourceKey && TileManager.draw(context, resourceKey,
                        marker.x - (marker.size / 2), marker.y - (marker.size / 2),
                        marker.size, marker.size);
                    context.restore();

                    if (!spriteDrawn) {
                        context.beginPath();
                        context.arc(marker.x, marker.y, 10 * state.zoom, 0, Math.PI * 2);
                        context.fillStyle = RESOURCE_COLORS[tile.resource];
                        context.fill();
                        context.lineWidth = 3 * state.zoom;
                        context.strokeStyle = 'rgb(28 22 38 / 75%)';
                        context.stroke();
                    }
                }

                if (tile.start !== null) {
                    context.beginPath();
                    context.arc(center.x, center.y, 27 * state.zoom, 0, Math.PI * 2);
                    context.fillStyle = '#fff3b0';
                    context.fill();
                    context.lineWidth = 5 * state.zoom;
                    context.strokeStyle = '#44295a';
                    context.stroke();
                    context.fillStyle = '#24152f';
                    context.fillText(String(tile.start), center.x, center.y + state.zoom);
                }
            }

            context.restore();
        }

        function render() {
            const width = state.viewportWidth;
            const height = state.viewportHeight;

            context.fillStyle = BACKGROUND;
            context.fillRect(0, 0, width, height);

            if (!state.ready) {
                return;
            }

            const tileWidth = TILE_WIDTH * state.zoom;
            const tileHeight = TILE_HEIGHT * state.zoom;

            for (const tile of state.tiles) {
                const destinationX = Math.floor((tile.x * state.zoom) + state.offsetX);
                const destinationY = Math.floor((tile.y * state.zoom) + state.offsetY);

                if (destinationX >= width
                    || destinationY >= height
                    || destinationX + tileWidth <= 0
                    || destinationY + tileHeight <= 0) {
                    continue;
                }

                const source = frameSource(tile.frame);
                context.drawImage(
                    state.tileset,
                    source.x,
                    source.y,
                    TILE_WIDTH,
                    TILE_HEIGHT,
                    destinationX,
                    destinationY,
                    tileWidth,
                    tileHeight
                );
            }

            drawStartTowns();
            drawRivers();
            drawMapMarkers();
        }

        function minimumZoom() {
            return Math.max(MIN_ZOOM,
                state.viewportWidth / MAP_WIDTH,
                state.viewportHeight / MAP_HEIGHT);
        }

        function constrainView() {
            const requiredZoom = minimumZoom();

            if (state.zoom < requiredZoom) {
                const previousZoom = state.zoom;
                const centerX = state.viewportWidth / 2;
                const centerY = state.viewportHeight / 2;
                const worldX = (centerX - state.offsetX) / previousZoom;
                const worldY = (centerY - state.offsetY) / previousZoom;

                state.zoom = requiredZoom;
                state.offsetX = centerX - (worldX * state.zoom);
                state.offsetY = centerY - (worldY * state.zoom);
            }

            state.offsetX = Math.min(0, Math.max(
                state.viewportWidth - (MAP_WIDTH * state.zoom), state.offsetX));
            state.offsetY = Math.min(0, Math.max(
                state.viewportHeight - (MAP_HEIGHT * state.zoom), state.offsetY));
        }

        function resize() {
            const bounds = canvas.getBoundingClientRect();
            const ratio = Math.max(1, window.devicePixelRatio || 1);

            state.viewportWidth = Math.max(1, Math.round(bounds.width));
            state.viewportHeight = Math.max(1, Math.round(bounds.height));
            canvas.width = Math.round(state.viewportWidth * ratio);
            canvas.height = Math.round(state.viewportHeight * ratio);
            context.setTransform(ratio, 0, 0, ratio, 0, 0);
            context.imageSmoothingEnabled = true;
            constrainView();
            render();
        }

        function stopDragging(event) {
            if (!state.dragging
                || (event && event.pointerId !== undefined && event.pointerId !== state.pointerId)) {
                return;
            }

            state.dragging = false;
            state.pointerId = null;
            canvas.classList.remove('is-dragging');
            hideResourceTooltip();
        }

        function onPointerDown(event) {
            if (event.button !== 0) {
                return;
            }

            state.dragging = true;
            state.pointerId = event.pointerId;
            state.lastX = event.clientX;
            state.lastY = event.clientY;
            hideResourceTooltip();
            canvas.classList.add('is-dragging');

            if (canvas.setPointerCapture) {
                canvas.setPointerCapture(event.pointerId);
            }
        }

        function onPointerMove(event) {
            if (!state.dragging) {
                updateResourceTooltip(event);
                return;
            }
            if (event.pointerId !== state.pointerId) {
                return;
            }

            state.offsetX += event.clientX - state.lastX;
            state.offsetY += event.clientY - state.lastY;
            state.lastX = event.clientX;
            state.lastY = event.clientY;
            constrainView();
            render();
        }

        function onWheel(event) {
            event.preventDefault();
            hideResourceTooltip();

            const deltaMultiplier = event.deltaMode === 1
                ? 16
                : event.deltaMode === 2 ? state.viewportHeight : 1;
            const zoomFactor = Math.exp(-event.deltaY * deltaMultiplier * ZOOM_SENSITIVITY);
            const previousZoom = state.zoom;
            const requiredZoom = minimumZoom();
            const allowedMaximumZoom = Math.max(MAX_ZOOM, requiredZoom);
            const nextZoom = Math.max(requiredZoom, Math.min(allowedMaximumZoom,
                previousZoom * zoomFactor));

            if (nextZoom === previousZoom) {
                return;
            }

            const bounds = canvas.getBoundingClientRect();
            const pointerX = event.clientX - bounds.left;
            const pointerY = event.clientY - bounds.top;
            const worldX = (pointerX - state.offsetX) / previousZoom;
            const worldY = (pointerY - state.offsetY) / previousZoom;

            state.zoom = nextZoom;
            state.offsetX = pointerX - (worldX * nextZoom);
            state.offsetY = pointerY - (worldY * nextZoom);
            constrainView();
            render();
        }

        function resetMap() {
            hideResourceTooltip();
            state.offsetX = 0;
            state.offsetY = 0;
            state.zoom = Math.max(1, minimumZoom());
            constrainView();
            render();
        }

        function updateInterface() {
            if (seedInput) {
                seedInput.value = state.world.seed;
            }
            if (styleInput) {
                styleInput.value = state.world.style;
            }
            if (stats) {
                const metrics = state.world.metrics;
                stats.textContent = `${Math.round(metrics.landRatio * 100)}% land · `
                    + `${metrics.riverTiles} river hexes · `
                    + `starts ≥ ${metrics.minimumStartDistance} hexes apart`;
            }
        }

        function updateLocation() {
            if (!window.history || !window.history.replaceState) {
                return;
            }

            try {
                const url = new URL(window.location.href);
                url.searchParams.set('seed', state.world.seed);
                url.searchParams.set('style', state.world.style);
                window.history.replaceState(null, '', url);
            } catch (error) {
                // Direct file access and privacy-restricted browsers may reject history changes.
            }
        }

        function regenerate(seed, style) {
            state.world = generateWorld({
                seed: seed,
                style: style,
                playerCount: settings.playerCount || 4
            });
            state.tiles = state.world.tiles;
            updateInterface();
            updateLocation();
            resetMap();
            return state.world;
        }

        state.tileset.onload = function () {
            state.ready = true;
            if (loading) {
                loading.hidden = true;
            }
            render();
        };

        state.tileset.onerror = function () {
            if (loading) {
                loading.hidden = false;
                loading.textContent = 'Could not load the terrain tileset.';
                loading.classList.add('has-error');
            }
        };

        TileManager.ready.then(render).catch(function () {
            // Colored resource markers remain available if an optional sheet fails to load.
        });

        canvas.addEventListener('pointerdown', onPointerDown);
        canvas.addEventListener('pointermove', onPointerMove);
        canvas.addEventListener('pointerup', stopDragging);
        canvas.addEventListener('pointercancel', stopDragging);
        canvas.addEventListener('pointerleave', hideResourceTooltip);
        canvas.addEventListener('wheel', onWheel, { passive: false });
        window.addEventListener('blur', stopDragging);
        window.addEventListener('resize', resize);
        if (reset) {
            reset.addEventListener('click', resetMap);
        }
        if (generatorForm) {
            generatorForm.addEventListener('submit', function (event) {
                event.preventDefault();
                regenerate(seedInput ? seedInput.value.trim() || freshSeed() : freshSeed(),
                    styleInput ? styleInput.value : 'continents');
            });
        }
        if (shuffle) {
            shuffle.addEventListener('click', function () {
                regenerate(freshSeed(), styleInput ? styleInput.value : 'continents');
            });
        }

        updateInterface();
        resize();
        state.tileset.src = settings.tileset
            || canvas.getAttribute('data-tileset')
            || 'assets/arts/terrain_hextiles_painted_basic_256x384.png';

        return {
            generate: regenerate,
            render: render,
            reset: resetMap,
            state: state
        };
    }

    function autoMount() {
        const rootElement = document.querySelector('[data-momma-bear-demo]');
        if (rootElement) {
            mount();
        }
    }

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', autoMount);
        } else {
            autoMount();
        }
    }

    return Object.freeze({
        MAP_COLUMNS: MAP_COLUMNS,
        MAP_ROWS: MAP_ROWS,
        TILE_WIDTH: TILE_WIDTH,
        TILE_HEIGHT: TILE_HEIGHT,
        OCEAN_FRAMES: OCEAN_FRAMES,
        TERRAIN_FRAMES: TERRAIN_FRAMES,
        WEIGHTED_TILE_FRAMES: WEIGHTED_TILE_FRAMES,
        generateWorld: generateWorld,
        hexDistance: MapGenerator.hexDistance,
        pickFrame: pickFrame,
        tilePosition: tilePosition,
        frameSource: frameSource,
        createMap: createMap,
        mount: mount
    });
}));
