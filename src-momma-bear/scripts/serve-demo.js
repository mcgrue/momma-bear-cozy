#!/usr/bin/env node
'use strict';

const FS = require('fs');
const HTTP = require('http');
const Path = require('path');
const URL = require('url');

const root = Path.resolve(__dirname, '..', 'momma-bear');
const host = '127.0.0.1';
const port = Number(process.env.PORT || 4173);
const mimeTypes = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png'
};

const server = HTTP.createServer((request, response) => {
    const requestPath = decodeURIComponent(URL.parse(request.url).pathname);
    const relativePath = requestPath === '/' ? 'index.html' : requestPath.replace(/^\/+/, '');
    const filePath = Path.resolve(root, relativePath);

    if (filePath !== root && !filePath.startsWith(`${root}${Path.sep}`)) {
        response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end('Forbidden');
        return;
    }

    FS.stat(filePath, (statError, stats) => {
        if (statError || !stats.isFile()) {
            response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            response.end('Not found');
            return;
        }

        response.writeHead(200, {
            'Cache-Control': 'no-store',
            'Content-Type': mimeTypes[Path.extname(filePath).toLowerCase()] || 'application/octet-stream'
        });
        FS.createReadStream(filePath).pipe(response);
    });
});

server.listen(port, host, () => {
    console.log(`Momma Bear demo: http://${host}:${port}/`);
    console.log('Press Ctrl+C to stop.');
});
