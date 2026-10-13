'use strict';

const OS = require('os');
const Path = require('path');
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
    testDir: './tests/browser',
    outputDir: Path.join(OS.tmpdir(), 'momma-bear-playwright-results'),
    fullyParallel: false,
    workers: 1,
    reporter: 'line',
    use: {
        baseURL: 'http://127.0.0.1:4182',
        channel: 'chrome',
        headless: true,
        screenshot: 'only-on-failure',
        viewport: { width: 1280, height: 900 }
    },
    webServer: {
        command: 'node scripts/serve-demo.js',
        env: { PORT: '4182' },
        url: 'http://127.0.0.1:4182/',
        reuseExistingServer: false,
        timeout: 15_000
    }
});
