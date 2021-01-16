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
    let sprite = new Cozy.Sprite({
        texture: 'tileset_1',
        position: { x: (x * 256), y: (y * 256) },
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
    addTile(0, 0, 0);
    addTile(1, 0, 1);
    addTile(2, 0, 2);
    addTile(3, 0, 3);
    addTile(0, 1, 4);
    addTile(1, 1, 5);
    addTile(2, 1, 6);
    addTile(3, 1, 7);
    addTile(0, 2, 8);
    addTile(1, 2, 9);
    addTile(2, 2, 10);
    addTile(3, 2, 11);
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