'use strict';

const { test, expect } = require('@playwright/test');

const TILE_WIDTH = 256;
const TILE_ROW_STEP = 192;
const HEX_TOP_INSET = 128;
const HEX_QUARTER_HEIGHT = 64;
const MAP_COLUMNS = 30;
const MAP_ROWS = 20;

function pointKey(point) {
    return `${point.x},${point.y}`;
}

function edgeKey(first, second) {
    return [pointKey(first), pointKey(second)].sort().join('|');
}

function paintedHexCorners(column, row) {
    const originX = (column * TILE_WIDTH) + (row % 2 === 1 ? TILE_WIDTH / 2 : 0);
    const originY = row * TILE_ROW_STEP;
    return [
        { x: originX + 128, y: originY + HEX_TOP_INSET },
        { x: originX + 256, y: originY + HEX_TOP_INSET + HEX_QUARTER_HEIGHT },
        { x: originX + 256, y: originY + HEX_TOP_INSET + (HEX_QUARTER_HEIGHT * 3) },
        { x: originX + 128, y: originY + HEX_TOP_INSET + (HEX_QUARTER_HEIGHT * 4) },
        { x: originX, y: originY + HEX_TOP_INSET + (HEX_QUARTER_HEIGHT * 3) },
        { x: originX, y: originY + HEX_TOP_INSET + HEX_QUARTER_HEIGHT }
    ];
}

test('rivers render only on painted hex boundaries', async ({ page }) => {
    await page.addInitScript(() => {
        const prototype = CanvasRenderingContext2D.prototype;
        const originalBeginPath = prototype.beginPath;
        const originalMoveTo = prototype.moveTo;
        const originalLineTo = prototype.lineTo;
        const originalStroke = prototype.stroke;

        window.__mommaBearRiverStrokes = [];

        prototype.beginPath = function () {
            this.__mommaBearPath = [];
            return originalBeginPath.apply(this, arguments);
        };
        prototype.moveTo = function (x, y) {
            this.__mommaBearPath = [{ x, y }];
            return originalMoveTo.apply(this, arguments);
        };
        prototype.lineTo = function (x, y) {
            this.__mommaBearPath.push({ x, y });
            return originalLineTo.apply(this, arguments);
        };
        prototype.stroke = function () {
            if (this.strokeStyle === '#65c9e8' && this.__mommaBearPath.length === 2) {
                window.__mommaBearRiverStrokes.push(this.__mommaBearPath);
            }
            return originalStroke.apply(this, arguments);
        };
    });

    await page.goto('/?seed=momma-bear&style=continents');
    await expect(page.locator('[data-momma-bear-loading]')).toBeHidden();

    const firstPaintedOceanRow = await page.evaluate(async () => {
        const image = new Image();
        image.src = 'assets/arts/terrain_hextiles_painted_basic_256x384.png';
        await image.decode();

        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 384;
        const context = canvas.getContext('2d');
        context.drawImage(image, 1024, 0, 256, 384, 0, 0, 256, 384);
        const pixels = context.getImageData(0, 0, 256, 384).data;

        for (let y = 0; y < 384; y += 1) {
            for (let x = 0; x < 256; x += 1) {
                if (pixels[((y * 256 + x) * 4) + 3] > 0) {
                    return y;
                }
            }
        }
        return null;
    });
    expect(firstPaintedOceanRow).toBe(HEX_TOP_INSET);

    const strokes = await page.evaluate(() => window.__mommaBearRiverStrokes);
    expect(strokes.length).toBeGreaterThan(3);

    for (let drag = 0; drag < 3; drag += 1) {
        await page.mouse.move(1150, 750);
        await page.mouse.down();
        await page.mouse.move(250, 220, { steps: 3 });
        await page.mouse.up();
    }

    const paintedBoundaries = new Set();
    for (let row = 0; row < MAP_ROWS; row += 1) {
        for (let column = 0; column < MAP_COLUMNS; column += 1) {
            const corners = paintedHexCorners(column, row);
            for (let index = 0; index < corners.length; index += 1) {
                paintedBoundaries.add(edgeKey(corners[index], corners[(index + 1) % corners.length]));
            }
        }
    }

    const misaligned = strokes
        .map(([from, to]) => edgeKey(from, to))
        .filter((key) => !paintedBoundaries.has(key));

    expect(misaligned, `misaligned river strokes:\n${misaligned.join('\n')}`).toEqual([]);
});
