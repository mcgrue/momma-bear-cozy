'use strict';

const { test, expect } = require('@playwright/test');

test('start locations one and two render terrain-appropriate towns', async ({ page }) => {
    await page.addInitScript(() => {
        const originalDrawImage = CanvasRenderingContext2D.prototype.drawImage;
        window.__mommaBearTownDraws = [];
        CanvasRenderingContext2D.prototype.drawImage = function (image) {
            if (image && image.src && image.src.includes('/assets/arts/towns/')) {
                window.__mommaBearTownDraws.push({
                    src: image.src,
                    destination: Array.from(arguments).slice(1)
                });
            }
            return originalDrawImage.apply(this, arguments);
        };
    });

    await page.goto('/?seed=momma-bear&style=continents');
    await page.evaluate(() => window.TileManager.ready);

    const result = await page.evaluate(() => ({
        townKeys: Object.keys(window.TileManager.towns),
        startTownTiles: window.TileManager.startTownTiles,
        draws: window.__mommaBearTownDraws
    }));

    expect(result.townKeys).toEqual([
        'plainsVillageTownA',
        'plainsVillageTownB',
        'dirtVillageTownA',
        'dirtVillageTownB'
    ]);
    expect(result.startTownTiles).toEqual({
        plains: ['plainsVillageTownA', 'plainsVillageTownB'],
        dirt: ['dirtVillageTownA', 'dirtVillageTownB']
    });
    expect(result.draws.some((draw) => draw.src.endsWith('/towns/dirt-village-a.png'))).toBe(true);
    expect(result.draws.some((draw) => draw.src.endsWith('/towns/plains-village-b.png'))).toBe(true);
    expect(result.draws.every((draw) => draw.destination.length === 4)).toBe(true);
});
