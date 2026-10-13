'use strict';

(function (root, factory) {
    const instance = factory();

    if (typeof module === 'object' && module.exports) {
        module.exports = instance;
    }

    if (root) {
        root.TileManager = instance;
    }
}(typeof window !== 'undefined' ? window : null, function () {
    const ART_ROOT = 'assets/arts/';
    const LOWER_CAMEL_KEY = /^[a-z][A-Za-z0-9]*$/;
    const images = Object.create(null);
    let loadPromise = null;

    const resourceNames = Object.freeze([
        Object.freeze(['leadOre', 'copperIngots', 'goldOre', 'steelIngots',
            'silverIngots', 'goldIngots', 'deer', 'rawBeef']),
        Object.freeze(['rawPork', 'coalPile', 'limestoneBlocks', 'stoneWheel',
            'copperOre', 'dolphin', 'silverFish', 'salmonSteak']),
        Object.freeze(['clayBricks', 'whiteStonePile', 'iceBlock', 'cottonBolls',
            'redIronOre', 'cutLogs', 'goldCoins', 'woodenBarrel']),
        Object.freeze(['oilBarrel', 'firewood', 'lumberStack', 'blueCrystalOre',
            'goldVeinedOre', 'whiteCrystalCluster', 'sheep', 'cottonPlant']),
        Object.freeze(['wheatSheaf', 'riceSheaf', 'waterWell', 'chicken',
            'rawPoultry', 'animalHide', 'tobaccoLeaf', 'leeks']),
        Object.freeze(['apples', 'steelBeam', 'breadLoaves', 'crudeOil',
            'beerMug', 'wineBottle', 'grapes', 'pottery'])
    ]);

    function resourceVariant(suffix) {
        return resourceNames.map((row) => Object.freeze(row.map((name) => `${name}${suffix}`)));
    }

    const sheetDefinitions = Object.freeze([
        Object.freeze({
            key: 'terrain',
            src: `${ART_ROOT}terrain_hextiles_painted_basic_256x384.png`,
            imageWidth: 2048,
            imageHeight: 2048,
            tileWidth: 256,
            tileHeight: 384,
            rows: Object.freeze([
                Object.freeze(['lushGrasslandA', 'lushGrasslandB', 'lushGrasslandC',
                    'lushGrasslandD', 'openOceanA', 'openOceanB', 'openOceanC', 'openOceanD']),
                Object.freeze(['snowyMountainA', 'snowyMountainB', 'snowyMountainC',
                    'snowyMountainD', 'sandDesertA', 'sandDesertB', 'sandDesertC', 'sandDesertD']),
                Object.freeze(['denseForestA', 'denseForestB', 'denseForestC',
                    'denseForestD', 'greenSwampA', 'greenSwampB', 'greenSwampC', 'greenSwampD']),
                Object.freeze(['dryWastelandA', 'dryWastelandB', 'dryWastelandC',
                    'dryWastelandD', 'starryVoidA', 'starryVoidB', 'starryVoidC', 'starryVoidD']),
                Object.freeze(['rockyHillsA', 'rockyHillsB', 'rockyHillsC',
                    'rockyHillsD', 'shadowedLandA', 'shadowedLandB', 'shadowedLandC', 'shadowedLandD'])
            ])
        }),
        Object.freeze({
            key: 'resourcesSoft',
            src: `${ART_ROOT}resources_sheet00.png`,
            imageWidth: 1024,
            imageHeight: 1024,
            tileWidth: 128,
            tileHeight: 128,
            rows: Object.freeze(resourceVariant('Soft'))
        }),
        Object.freeze({
            key: 'resourcesSharp',
            src: `${ART_ROOT}resources_sheet00_sharper.png`,
            imageWidth: 1024,
            imageHeight: 1024,
            tileWidth: 128,
            tileHeight: 128,
            rows: Object.freeze(resourceVariant('Sharp'))
        }),
        Object.freeze({
            key: 'gemsAndStone',
            src: `${ART_ROOT}gems_minerals_stone_metals_sheet1.png`,
            imageWidth: 1024,
            imageHeight: 1024,
            tileWidth: 128,
            tileHeight: 128,
            rows: Object.freeze([
                Object.freeze(['chalkStoneBlocks', 'slateStoneBlocks', 'graniteStoneBlocks',
                    'marbleStoneBlocks', 'sandstoneBlocks', 'veinedSlateBlocks',
                    'basaltStoneBlocks', 'pumiceStoneBlocks']),
                Object.freeze(['cutChalkBlocks', 'cutSlateBlocks', 'cutGraniteBlocks',
                    'cutMarbleBlocks', 'cutSandstoneBlocks', 'cutVeinedSlateBlocks',
                    'cutBasaltBlocks', 'cutPumiceBlocks']),
                Object.freeze(['chalkGravel', 'slateGravel', 'graniteGravel', 'marbleGravel',
                    'sandstoneGravel', 'veinedSlateGravel', 'basaltGravel', 'pumiceGravel']),
                Object.freeze(['chalkStoneCube', 'slateStoneCube', 'graniteStoneCube',
                    'marbleStoneCube', 'sandstoneCube', 'veinedSlateCube',
                    'basaltStoneCube', 'pumiceStoneCube']),
                Object.freeze(['graphiteOre', 'copperVeinedOre', 'silverVeinedOre',
                    'mossyOre', 'malachiteOre', 'goldOreCluster', 'opalGemCluster',
                    'rubyGemCluster']),
                Object.freeze(['paleMetalIngots', 'bronzeIngots', 'blueMetalOre',
                    null, null, null, 'roughOpalCluster', 'roughRubyCluster']),
                Object.freeze(['turquoiseGemCluster', 'quartzCrystalCluster', 'cutRubyCluster',
                    'obsidianShardCluster', 'diamondCluster', 'blackGemCluster',
                    'emeraldCluster', 'sapphireCluster']),
                Object.freeze(['bloodstoneCluster', 'roseQuartzCluster', 'darkRubyCluster',
                    'blackCrystalCluster', 'silverOreCluster', 'darkJadeCluster',
                    'roughEmeraldCluster', 'roughSapphireCluster'])
            ])
        }),
        Object.freeze({
            key: 'cutGems',
            src: `${ART_ROOT}gems_minerals_stone_metals_sheet2.png`,
            imageWidth: 1024,
            imageHeight: 256,
            tileWidth: 128,
            tileHeight: 128,
            rows: Object.freeze([
                Object.freeze(['polishedOpal', 'facetedRuby', 'facetedSapphire',
                    'facetedBlackDiamond', 'facetedDiamond', 'roughBlackDiamond',
                    'squareCutRuby', 'quartzBar']),
                Object.freeze(['facetedEmerald', 'polishedBloodstone'])
            ])
        }),
        Object.freeze({
            key: 'craftingAndHerbalism',
            src: `${ART_ROOT}crafting-herbalism-tools_sheet1.png`,
            imageWidth: 1024,
            imageHeight: 1024,
            tileWidth: 128,
            tileHeight: 128,
            rows: Object.freeze([
                Object.freeze(['redCapMushroom', 'brownMushroomCluster', 'redPotatoPile',
                    'brownPotatoPile', 'herbalTonicBucket', 'blueberrySprig',
                    'ginsengRoot', 'whiteCapMushroom']),
                Object.freeze(['rawWool', 'woolYarnBundle', 'whiteThreadSpool', 'linenRolls',
                    'ropeCoil', 'twineBall', 'featherBundle', 'whiteFeatherPile']),
                Object.freeze(['clayJar', 'orangeHerbPile', 'driedGrassPile', 'sulfurChunks',
                    'pasteBucket', 'driftwood', 'ropeSpool', 'redCoral']),
                Object.freeze(['charcoalPile', 'blackDyeBucket', 'oldBook', 'inkBottle',
                    'teaLeaves', 'blackCoalPile', 'whiteFlowers', 'bonePile']),
                Object.freeze(['copperWireSpool', 'ironNails', 'ironHardware', 'birchBark',
                    'yellowWax', 'amberChunks', 'tannedHide', 'animalHorns']),
                Object.freeze(['whiteCotton', 'whiteCloth', 'paperStack', 'whiteFur',
                    'brownFur', 'grayPelt', 'redKindling', 'leatherRoll']),
                Object.freeze(['stoneMallet', 'sandBagAndTrowel', 'woodenBucket', 'handHammer',
                    'doubleHatchets', 'utilityKnife', 'metalMallet', 'aloeLeaves']),
                Object.freeze(['carpentryToolbox', 'pickaxe', 'sickle', 'handSaw',
                    'scythe', 'shovel'])
            ])
        })
    ]);

    const sheets = Object.create(null);
    const tiles = Object.create(null);

    function displayName(key) {
        const baseKey = key.replace(/(?:Soft|Sharp)$/, '');
        const words = baseKey.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
        return words.charAt(0).toUpperCase() + words.slice(1);
    }

    for (const definition of sheetDefinitions) {
        if (sheets[definition.key]) {
            throw new Error(`Duplicate tile sheet key: ${definition.key}`);
        }

        sheets[definition.key] = Object.freeze({
            key: definition.key,
            src: definition.src,
            imageWidth: definition.imageWidth,
            imageHeight: definition.imageHeight,
            tileWidth: definition.tileWidth,
            tileHeight: definition.tileHeight
        });

        definition.rows.forEach((row, rowIndex) => {
            row.forEach((key, columnIndex) => {
                if (key === null) {
                    return;
                }
                if (!LOWER_CAMEL_KEY.test(key)) {
                    throw new Error(`Tile key is not lowerCamel: ${key}`);
                }
                if (tiles[key]) {
                    throw new Error(`Duplicate tile key: ${key}`);
                }

                const x = columnIndex * definition.tileWidth;
                const y = rowIndex * definition.tileHeight;
                if (x + definition.tileWidth > definition.imageWidth
                    || y + definition.tileHeight > definition.imageHeight) {
                    throw new Error(`Tile ${key} exceeds ${definition.key} bounds.`);
                }

                tiles[key] = Object.freeze({
                    key: key,
                    name: displayName(key),
                    sheet: definition.key,
                    column: columnIndex,
                    row: rowIndex,
                    x: x,
                    y: y,
                    width: definition.tileWidth,
                    height: definition.tileHeight
                });
            });
        });
    }

    Object.freeze(sheets);
    Object.freeze(tiles);

    const resourceTiles = Object.freeze({
        food: 'wheatSheafSharp',
        production: 'lumberStackSharp',
        strategic: 'steelIngotsSharp',
        luxury: 'polishedOpal'
    });

    function get(key) {
        const tile = tiles[key];
        if (!tile) {
            throw new Error(`Unknown tile key: ${key}`);
        }
        return tile;
    }

    function load() {
        if (loadPromise) {
            return loadPromise;
        }
        if (typeof Image === 'undefined') {
            loadPromise = Promise.resolve(api);
            return loadPromise;
        }

        loadPromise = Promise.all(Object.values(sheets).map((sheet) => new Promise((resolve, reject) => {
            const image = new Image();
            images[sheet.key] = image;
            image.onload = function () {
                resolve(image);
            };
            image.onerror = function () {
                reject(new Error(`Could not load tile sheet: ${sheet.src}`));
            };
            image.src = sheet.src;
        }))).then(() => api);

        return loadPromise;
    }

    function draw(context, key, x, y, width, height) {
        const tile = get(key);
        const image = images[tile.sheet];
        if (!image || !image.complete || image.naturalWidth === 0) {
            return false;
        }

        context.drawImage(image,
            tile.x, tile.y, tile.width, tile.height,
            x, y, width === undefined ? tile.width : width,
            height === undefined ? tile.height : height);
        return true;
    }

    const api = {
        sheets: sheets,
        tiles: tiles,
        resourceTiles: resourceTiles,
        get: get,
        load: load,
        draw: draw
    };
    api.ready = load();

    return Object.freeze(api);
}));
