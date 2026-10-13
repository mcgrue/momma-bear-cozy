'use strict';

const { test, expect } = require('@playwright/test');

const MAP_WIDTH = (30 * 256) + 128;
const MAP_HEIGHT = (19 * 192) + 384;

test('panning and zooming keep the viewport inside the map', async ({ page }) => {
    await page.goto('/?seed=momma-bear&style=continents');
    await expect(page.locator('[data-momma-bear-loading]')).toBeHidden();

    const result = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        canvas.style.width = '800px';
        canvas.style.height = '600px';
        canvas.setPointerCapture = function () {};
        document.body.appendChild(canvas);

        const map = window.MommaBear.mount({ canvas });
        const pointer = (type, x, y) => canvas.dispatchEvent(new PointerEvent(type, {
            bubbles: true,
            button: 0,
            clientX: x,
            clientY: y,
            pointerId: 7
        }));

        pointer('pointerdown', 100, 100);
        pointer('pointermove', 700, 500);
        pointer('pointerup', 700, 500);
        const topLeft = { x: map.state.offsetX, y: map.state.offsetY };

        pointer('pointerdown', 400, 300);
        pointer('pointermove', -20000, -20000);
        pointer('pointerup', -20000, -20000);
        const bottomRight = { x: map.state.offsetX, y: map.state.offsetY };

        canvas.dispatchEvent(new WheelEvent('wheel', {
            cancelable: true,
            clientX: 400,
            clientY: 300,
            deltaY: 100000
        }));
        const zoomedOut = {
            zoom: map.state.zoom,
            x: map.state.offsetX,
            y: map.state.offsetY,
            viewportWidth: map.state.viewportWidth,
            viewportHeight: map.state.viewportHeight
        };

        return { topLeft, bottomRight, zoomedOut };
    });

    expect(result.topLeft).toEqual({ x: 0, y: 0 });
    expect(result.bottomRight).toEqual({
        x: 800 - MAP_WIDTH,
        y: 600 - MAP_HEIGHT
    });
    expect(result.zoomedOut.zoom).toBe(0.25);
    expect(result.zoomedOut.x).toBeLessThanOrEqual(0);
    expect(result.zoomedOut.x).toBeGreaterThanOrEqual(
        result.zoomedOut.viewportWidth - (MAP_WIDTH * result.zoomedOut.zoom));
    expect(result.zoomedOut.y).toBeLessThanOrEqual(0);
    expect(result.zoomedOut.y).toBeGreaterThanOrEqual(
        result.zoomedOut.viewportHeight - (MAP_HEIGHT * result.zoomedOut.zoom));
});

test('minimum zoom expands to cover a larger viewport', async ({ page }) => {
    await page.goto('/?seed=momma-bear&style=continents');
    await expect(page.locator('[data-momma-bear-loading]')).toBeHidden();

    const state = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        canvas.style.width = '4000px';
        canvas.style.height = '2000px';
        document.body.appendChild(canvas);

        const map = window.MommaBear.mount({ canvas });
        canvas.dispatchEvent(new WheelEvent('wheel', {
            cancelable: true,
            clientX: 2000,
            clientY: 1000,
            deltaY: 100000
        }));

        return {
            zoom: map.state.zoom,
            viewportWidth: map.state.viewportWidth,
            viewportHeight: map.state.viewportHeight
        };
    });

    expect((MAP_WIDTH * state.zoom) + 1e-8).toBeGreaterThanOrEqual(state.viewportWidth);
    expect((MAP_HEIGHT * state.zoom) + 1e-8).toBeGreaterThanOrEqual(state.viewportHeight);
});
