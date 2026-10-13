'use strict';

const { test, expect } = require('@playwright/test');

test('the scroll wheel zooms around the pointer and reset restores the view', async ({ page }) => {
    await page.goto('/?seed=momma-bear&style=continents');
    await expect(page.locator('[data-momma-bear-loading]')).toBeHidden();

    const result = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        canvas.style.width = '800px';
        canvas.style.height = '600px';
        document.body.appendChild(canvas);

        const map = window.MommaBear.mount({ canvas });
        const bounds = canvas.getBoundingClientRect();
        const clientX = bounds.left + 400;
        const clientY = bounds.top + 300;
        const wheel = new WheelEvent('wheel', {
            bubbles: true,
            cancelable: true,
            clientX,
            clientY,
            deltaY: -100
        });
        const dispatched = canvas.dispatchEvent(wheel);
        const zoomed = {
            zoom: map.state.zoom,
            offsetX: map.state.offsetX,
            offsetY: map.state.offsetY,
            defaultPrevented: wheel.defaultPrevented,
            dispatched
        };

        map.reset();
        const reset = {
            zoom: map.state.zoom,
            offsetX: map.state.offsetX,
            offsetY: map.state.offsetY
        };

        canvas.dispatchEvent(new WheelEvent('wheel', {
            cancelable: true,
            clientX,
            clientY,
            deltaY: -100000
        }));
        const maximumZoom = map.state.zoom;
        canvas.dispatchEvent(new WheelEvent('wheel', {
            cancelable: true,
            clientX,
            clientY,
            deltaY: 100000
        }));

        return { zoomed, reset, maximumZoom, minimumZoom: map.state.zoom };
    });

    expect(result.zoomed.zoom).toBeGreaterThan(1);
    expect(result.zoomed.offsetX).toBeCloseTo(400 * (1 - result.zoomed.zoom), 8);
    expect(result.zoomed.offsetY).toBeCloseTo(300 * (1 - result.zoomed.zoom), 8);
    expect(result.zoomed.defaultPrevented).toBe(true);
    expect(result.zoomed.dispatched).toBe(false);
    expect(result.reset).toEqual({ zoom: 1, offsetX: 0, offsetY: 0 });
    expect(result.maximumZoom).toBe(3);
    expect(result.minimumZoom).toBe(0.25);
});
