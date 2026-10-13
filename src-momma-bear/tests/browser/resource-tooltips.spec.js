'use strict';

const { test, expect } = require('@playwright/test');

test('resource sprites show their names on pointer hover', async ({ page }) => {
    await page.goto('/?seed=momma-bear&style=continents');
    await page.evaluate(() => window.TileManager.ready);

    const labels = await page.evaluate(() => {
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
            seed: 'tooltip-resources'
        });
        const result = {};

        for (const type of ['food', 'production', 'strategic', 'luxury']) {
            const tile = map.state.tiles.find((candidate) => candidate.resource === type);
            const markerX = 400;
            const markerY = 300;
            map.state.offsetX = markerX - ((tile.x + 128 + 58) * map.state.zoom);
            map.state.offsetY = markerY - ((tile.y + 192 + 22) * map.state.zoom);
            canvas.dispatchEvent(new PointerEvent('pointermove', {
                bubbles: true,
                clientX: markerX,
                clientY: markerY,
                pointerId: 1
            }));
            result[type] = {
                text: tooltip.textContent,
                hidden: tooltip.hidden
            };
        }

        canvas.dispatchEvent(new PointerEvent('pointerleave', {
            bubbles: true,
            pointerId: 1
        }));
        result.hiddenAfterLeave = tooltip.hidden;
        return result;
    });

    expect(labels).toEqual({
        food: { text: 'Wheat Sheaf', hidden: false },
        production: { text: 'Lumber Stack', hidden: false },
        strategic: { text: 'Steel Ingots', hidden: false },
        luxury: { text: 'Polished Opal', hidden: false },
        hiddenAfterLeave: true
    });
});
