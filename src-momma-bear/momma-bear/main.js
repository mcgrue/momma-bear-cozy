global["compiledGame"] =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(1);


/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const Cozy = __webpack_require__(2);
let ButtonState;
let plane;
let layer;
let sprite;
let map;
function load() {
    return Cozy.loadTextures({
        tileset_1: "assets/arts/terrain_hextiles_painted_basic_256x384.png"
    });
}
exports.load = load;
function addTile(x, y, frame) {
    let dx = (x * 256);
    let dy = (y * 256);
    dy -= (y * 64);
    if (y % 2 === 1) {
        dx += 128;
    }
    let sprite = new Cozy.Sprite({
        texture: 'tileset_1',
        position: { x: dx, y: dy },
        frameSize: {
            x: 256,
            y: 384
        },
        frame: frame
    });
    layer.add(sprite);
    map.push(sprite);
}
function start() {
    Cozy.setBackground('#880088');
    map = [];
    plane = Cozy.addPlane(Cozy.RenderPlane, {
        renderable: true
    });
    layer = plane.addRenderLayer();
    var y = 0;
    var x = 0;
    for (y = 0; y < 20; y++) {
        for (x = 0; x < 30; x++) {
            addTile(x, y, Math.floor(Math.random() * Math.floor(39)));
        }
    }
    Cozy.unpause();
}
exports.start = start;
function frame(dt) {
    if (Cozy.Input.mouseInfo().buttons[0] === 1) {
        let dx = Cozy.Input.mouseInfo().dx;
        let dy = Cozy.Input.mouseInfo().dy;
        layer.adjustPosition(dx, dy);
        console.log(`BOOP ${dx} ${dy}`);
    }
    else {
        console.log("UNBOOP");
    }
}
exports.frame = frame;


/***/ }),
/* 2 */
/***/ (function(module, exports) {

(function() { module.exports = global["Cozy"]; }());

/***/ })
/******/ ]);