'use strict';

const { test, expect } = require('@playwright/test');

test('towns show their TileManager names on pointer hover', async ({ page }) => {
    await page.goto('/?seed=momma-bear&style=continents');
    await page.evaluate(() => window.TileManager.ready);

    const result = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        canvas.style.position = 'fixed';
        canvas.style.inset = '0 auto auto 0';
        canvas.style.width = '800px';
        canvas.style.height = '600px';
        document.body.appendChild(canvas);

        const tooltip = document.createElement('div');
        tooltip.hidden = true;
        document.body.appendChild(tooltip);

        const map = window.MommaBear.mount({
            canvas,
            resourceTooltip: tooltip,
            seed: 'town-tooltip-names',
            style: 'continents'
        });
        const labels = [];

        for (const start of [1, 2]) {
            const tile = map.state.tiles.find((candidate) => candidate.start === start);
            const terrainStyle = ['desert', 'hills', 'wasteland'].includes(tile.terrain)
                ? 'dirt'
                : 'plains';
            const townKey = window.TileManager.startTownTiles[terrainStyle][start - 1];
            const pointerX = 400;
            const pointerY = 300;
            map.state.offsetX = pointerX - ((tile.x + 128) * map.state.zoom);
            map.state.offsetY = pointerY - ((tile.y + 192) * map.state.zoom);

            canvas.dispatchEvent(new PointerEvent('pointermove', {
                bubbles: true,
                clientX: pointerX,
                clientY: pointerY,
                pointerId: 1
            }));
            labels.push({
                expected: window.TileManager.towns[townKey].name,
                actual: tooltip.textContent,
                hidden: tooltip.hidden
            });
        }

        canvas.dispatchEvent(new PointerEvent('pointerleave', {
            bubbles: true,
            pointerId: 1
        }));
        return { labels, hiddenAfterLeave: tooltip.hidden };
    });

    expect(result.labels).toHaveLength(2);
    for (const label of result.labels) {
        expect(label.actual).toBe(label.expected);
        expect(label.hidden).toBe(false);
    }
    expect(result.hiddenAfterLeave).toBe(true);
});
