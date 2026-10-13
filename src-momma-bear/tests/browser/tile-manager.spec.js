'use strict';

const { test, expect } = require('@playwright/test');

test('TileManager catalogs and loads every supplied sprite sheet', async ({ page }) => {
    await page.goto('/?seed=momma-bear&style=continents');

    const catalog = await page.evaluate(async () => {
        const manager = window.TileManager;
        await manager.ready;
        const tiles = Object.values(manager.tiles);

        return {
            globalSingleton: manager === window.TileManager,
            sheetKeys: Object.keys(manager.sheets),
            tileCount: tiles.length,
            invalidKeys: tiles
                .map((tile) => tile.key)
                .filter((key) => !/^[a-z][A-Za-z0-9]*$/.test(key)),
            outOfBounds: tiles.filter((tile) => {
                const sheet = manager.sheets[tile.sheet];
                return tile.x < 0
                    || tile.y < 0
                    || tile.x + tile.width > sheet.imageWidth
                    || tile.y + tile.height > sheet.imageHeight;
            }).map((tile) => tile.key),
            resourceTiles: manager.resourceTiles,
            strategicTile: manager.get(manager.resourceTiles.strategic),
            luxuryTile: manager.get(manager.resourceTiles.luxury)
        };
    });

    expect(catalog.globalSingleton).toBe(true);
    expect(catalog.sheetKeys).toEqual([
        'terrain',
        'resourcesSoft',
        'resourcesSharp',
        'gemsAndStone',
        'cutGems',
        'craftingAndHerbalism'
    ]);
    expect(catalog.tileCount).toBe(269);
    expect(catalog.invalidKeys).toEqual([]);
    expect(catalog.outOfBounds).toEqual([]);
    expect(catalog.resourceTiles).toEqual({
        food: 'wheatSheafSharp',
        production: 'lumberStackSharp',
        strategic: 'steelIngotsSharp',
        luxury: 'polishedOpal'
    });
    expect(catalog.strategicTile.sheet).toBe('resourcesSharp');
    expect(catalog.luxuryTile.sheet).toBe('cutGems');
});

test('TileManager draws named resource sprites', async ({ page }) => {
    await page.goto('/?seed=momma-bear&style=continents');

    const result = await page.evaluate(async () => {
        await window.TileManager.ready;
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const context = canvas.getContext('2d');
        const drawn = window.TileManager.draw(context, 'polishedOpal', 0, 0, 128, 128);
        const pixels = context.getImageData(0, 0, 128, 128).data;
        let opaquePixels = 0;

        for (let index = 3; index < pixels.length; index += 4) {
            if (pixels[index] > 0) {
                opaquePixels += 1;
            }
        }

        return { drawn, opaquePixels };
    });

    expect(result.drawn).toBe(true);
    expect(result.opaquePixels).toBeGreaterThan(1000);
});

test('the map renderer uses TileManager resource sprites', async ({ page }) => {
    await page.addInitScript(() => {
        const originalDrawImage = CanvasRenderingContext2D.prototype.drawImage;
        window.__mommaBearDrawnSheets = [];
        CanvasRenderingContext2D.prototype.drawImage = function (image) {
            if (image && image.src) {
                window.__mommaBearDrawnSheets.push(image.src);
            }
            return originalDrawImage.apply(this, arguments);
        };
    });

    await page.goto('/?seed=momma-bear&style=continents');
    await page.evaluate(() => window.TileManager.ready);

    const drawnSheets = await page.evaluate(() => window.__mommaBearDrawnSheets);
    expect(drawnSheets.some((src) => src.endsWith('/resources_sheet00_sharper.png'))).toBe(true);
    expect(drawnSheets.some((src) => src.endsWith('/gems_minerals_stone_metals_sheet2.png'))).toBe(true);
});
