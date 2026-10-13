#!/usr/bin/env node
'use strict';

const FS = require('fs');
const Path = require('path');

const projectRoot = Path.resolve(__dirname, '..');
const sourceRoot = Path.join(projectRoot, 'momma-bear');
const outputRoot = process.argv[2]
    ? Path.resolve(process.argv[2])
    : Path.join(projectRoot, 'dist', 'momma-bear-demo');

const files = [
    ['momma-bear/index.html', 'index.html'],
    ['momma-bear/standalone.css', 'standalone.css'],
    ['momma-bear/map-generator.js', 'map-generator.js'],
    ['momma-bear/tile-manager.js', 'tile-manager.js'],
    ['momma-bear/standalone.js', 'standalone.js'],
    ['momma-bear/assets/arts/crafting-herbalism-tools_sheet1.png', 'assets/arts/crafting-herbalism-tools_sheet1.png'],
    ['momma-bear/assets/arts/gems_minerals_stone_metals_sheet1.png', 'assets/arts/gems_minerals_stone_metals_sheet1.png'],
    ['momma-bear/assets/arts/gems_minerals_stone_metals_sheet2.png', 'assets/arts/gems_minerals_stone_metals_sheet2.png'],
    ['momma-bear/assets/arts/resources_sheet00.png', 'assets/arts/resources_sheet00.png'],
    ['momma-bear/assets/arts/resources_sheet00_sharper.png', 'assets/arts/resources_sheet00_sharper.png'],
    ['momma-bear/assets/arts/terrain_hextiles_painted_basic_256x384.png', 'assets/arts/terrain_hextiles_painted_basic_256x384.png'],
    ['README.md', 'README.md']
];

for (const entry of files) {
    const source = Path.join(projectRoot, entry[0]);
    const destination = Path.join(outputRoot, entry[1]);

    if (!FS.existsSync(source)) {
        throw new Error(`Missing demo source: ${source}`);
    }

    FS.mkdirSync(Path.dirname(destination), { recursive: true });
    FS.copyFileSync(source, destination);
}

const manifest = {
    name: 'Momma Bear terrain demo',
    version: 1,
    entrypoint: 'index.html',
    files: files.map((entry) => entry[1])
};

FS.writeFileSync(
    Path.join(outputRoot, 'demo-manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8'
);

console.log(`Built standalone demo: ${outputRoot}`);
