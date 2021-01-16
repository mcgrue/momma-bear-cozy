import * as PIXI from 'pixi.js';
import * as path from 'path';

import { Audio } from './Audio';
import { initFileSystem, UserdataFile, File, Directory } from "./FileSystem";
import { Input } from "./Input";
import { Plane } from './Plane';
import { Texture } from "./Texture";

declare var FontFace:any;

class CozyState {
    public static Game:any;
    public static debug:boolean;

    public static config:Object;
    public static textures:{}[];
    public static planes:Plane[];
    public static browserWindow:any;
    public static platform:string;
    // let scene:Entity;
    public static gamePath:string;
    public static gameDir:Directory = null;
    public static libs:String[];

    public static paused:boolean;
    public static sizeMultiplier:number;
    public static autoResize:boolean;
}

let cozyState = null;

/**
 * Instantiate things and set things up so that the game can run. You will not
 * need to call this function directly; it is called from the game's HTML.
 * 
 * @param opts Configuration for this Cozy game.
 * @param overrides Temporary overrides coming in from the project manager.
 */

export async function setup(opts:any, overrides?:any) {
    let promises = [];

    cozyState = CozyState;
    window['cozyState'] = cozyState; // for debugging

    cozyState.debug = !!opts.debug;
    cozyState.browserWindow = opts.Electron ? opts.Electron.remote.getCurrentWindow() : window; // TODO should probably actually be a weird wrapper
    if (cozyState.debug && cozyState.browserWindow['openDevTools']) { 
        const openDevTools = () => {
            cozyState.browserWindow['openDevTools']();

            if(cozyState.browserWindow['devToolsWebContents']) {
                cozyState.browserWindow['devToolsWebContents'].focus();
            }
        };

        window.addEventListener('keyup', (e) => {
            if (e['keyCode'] === 192) { // ~ key, opens console
                openDevTools();
            }
        });

        openDevTools();
        alert('debug tools mode activated.\n\nPlease wait until chrome inspector opens before continuing.\n\nto remove this functionality, remove the "debug" item from your game\'s config');
    }

    console.log("Creating Cozy Object...", opts, overrides);

    cozyState.libs = JSON.parse(opts.libRoots);
    cozyState.config = opts;
    cozyState.gamePath = opts.game;
    
    // set platform string
    if (opts.Electron) {
        cozyState.platform = 'native';
    } else {
        cozyState.platform = 'web';
    }

    // set up filesystem
    if (cozyState.config['userdata'] === undefined) {
        console.warn("No 'userdata' key found in cozyState.config. This will be a problem when you export -- be sure to set it to something.");
        let p = cozyState.gamePath.split(path.sep);
        cozyState.config['userdata'] = p[p.length - 1];
    }

    await initFileSystem(cozyState.gamePath, cozyState.config['userdata']);
    try {
        let f = await (new UserdataFile('config.json')).load();
        Object.assign(cozyState.config, f.getData('json'));
    } catch (e) {
        // no user config, that's fine; carry on without it
    }

    cozyState.config = Object.assign(cozyState.config, overrides);

    if (!cozyState.hasOwnProperty('integerUpscale')) {
        cozyState.integerUpscale = true;
    }
    if (cozyState.integerUpscale) {
        document.body.classList.add('integerUpscale');
    }

    cozyState.gameDir = new Directory(cozyState.gamePath);
    cozyState.textures = [];
    cozyState.planes = [];
    cozyState.paused = true;

    // set up graphics
    PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
    cozyState.planes = [];

    // Now that we have our full config, do the rest of our configuration

    cozyState.autoResize = cozyState.config.hasOwnProperty('autoResize') ? cozyState.config['autoResize'] : true;
    Input.init(cozyState.config['controls']);

    window.addEventListener('resize', (e) => onResize(e));
    window.addEventListener('blur', (e) => {
        if (getFullScreen()) {
            cozyState.browserWindow.minimize();
        }
    });
    window.addEventListener('focus', (e) => {
        Input.clear();
    });

    if (cozyState.config['fullscreen']) {
        setFullScreen(true);
    }
    
    // audio
    Audio.init({
        NOSFX:      cozyState.config['NOSFX'],
        NOMUSIC:    cozyState.config['NOMUSIC']
    });

    if (cozyState.config['volume']) {
        if (cozyState.config['volume']['sfx'] !== undefined) {
            Audio.setSFXVolume(cozyState.config['volume']['sfx']);
        }
        if (cozyState.config['volume']['music'] !== undefined) {
            Audio.setMusicVolume(cozyState.config['volume']['music']);
        }
    }

    // load CSS, from libs and game
    let cssPromises = [];
    if (cozyState.config['lib']) {
        let libRoots:Directory[] = (cozyState.libs).reduce((list, path) => {
            console.log(path);
            list.push(new Directory(path));
            return list;
        }, []);

        let libJSONs = [];
        for (let root of libRoots) {
            libJSONs.push.apply(libJSONs, root.glob("**/lib.json"));
        }
        await Promise.all(libJSONs.reduce((list, libFile) => {
            list.push(libFile.load());
            return list;
        }, []));

        let availableLibs = {};
        for (let f of libJSONs) {
            let d = f.getData('json');
            console.log(">>", f, d);
            availableLibs[d.id] = d;
            availableLibs[d.id].dir = f.dir;
        }

        let libs = cozyState.config['lib'];
        for (const k of libs) {
            console.log("Loading kit:", k, availableLibs[k]);
            if (!availableLibs[k]) {
                console.error("Didn't recognize kit", k);
                continue;
            }
            if (availableLibs[k].css) {
                for (let path of availableLibs[k].css) {
                    for (let f of availableLibs[k].dir.glob(path)) {
                        console.log("stylesheet <kit:" + k + ">:", availableLibs[k].dir.path, path, f);
                        cssPromises.push(addStyleSheet(<File>f));
                    }
                }
            }
        }
    }

    if (cozyState.config['css']) {
        if (typeof cozyState.config['css'] === 'string') cozyState.config['css'] = [cozyState.config['css']];
        for (let path of cozyState.config['css']) {
            promises.push((async function() {
                let files = await cozyState.gameDir.glob(path);
                console.log("Got the glob", files);
                for (let f of files) {
                    console.log("stylesheet <game>:", cozyState.gameDir.path, path, f);
                    cssPromises.push(addStyleSheet(<File>f));
                }
            })());
        }
    }
        
    await Promise.all(cssPromises);

    await document['fonts'].ready;

    await Promise.all(promises);
}

/**
 * Load and start the game. Like Cozy.setup(), you will never need to call
 * this yourself.
 * 
 * @param g The game to run.
 */
export function run(g) {
    cozyState.Game = g;

    let doLoad = () => {
        document.getElementById('loader-frame').remove();

        // set up window
        var multX = screen.availWidth / cozyState.config['width'],
            multY = screen.availHeight/ cozyState.config['height'],
            mult  = Math.floor(Math.min(multX, multY));
        if (cozyState.browserWindow['setContentSize']) {
            cozyState.browserWindow.setContentSize(cozyState.config['width'] * mult, cozyState.config['height'] * mult);
            cozyState.browserWindow.center();
        }
        cozyState.Game.start();

        onResize();
        requestAnimationFrame(frame);
    };

    if (cozyState.Game.load) {
        let p = cozyState.Game.load();
        if (p instanceof Promise) {
            p.then(doLoad);
        } else if (p instanceof Array) {
            Promise.all(p).then(doLoad);
        } else {
            doLoad();
        }
    } else {
        doLoad();
    }
}

const fps60 = 1.0 / 60.0;
let last_t = null;

/**
 * Called every time the app draws a new frame. Do not call this directly, it
 * is called by the animation loop.
 * 
 * @param new_t New timestamp.
 */
export function frame(new_t:number) {
    requestAnimationFrame(frame); // do this here so if there's an error it doesn't stop everything forever

    // the very first time we call frame, go with a dt of 0
    if (last_t === null) {
        last_t = new_t;
    }

    let dt = (new_t - last_t)/1000;
    last_t = new_t;

    // if we've dropped a frame, do updates separately for each...
    let updatedt = dt;
    while (updatedt > 0) {
        let _dt = Math.min(updatedt, fps60);
        Input.update(_dt);
        Audio.update(_dt);

        if (cozyState.paused) return;
        for (let plane of cozyState.planes) plane.update(_dt);

        if (cozyState.Game && cozyState.Game.frame) {
            cozyState.Game.frame(_dt);
        }

        updatedt -= fps60;
    }


    // only do one render
    for (let plane of cozyState.planes) plane.render(dt);

    if (cozyState.Game && cozyState.Game.postRender) {
        cozyState.Game.postRender(dt);
    }
}

/**
 * Get a {@link Directory} object representing the game's root directory (i.e. 
 * where the config.json is).
 */
export function gameDir():Directory {
    return cozyState.gameDir;
}

/**
 * Get a {@link Directory} representing the game's user data directory -- this
 * is usually under the operating system's "My Documents" or similar folder.
 */
export function userDataDir():Directory {
    return cozyState.userDataDir;
}

/**
 * Fetch a configuration variable. If *k* is not supplied, the entire config
 * object is returned.
 * @param k (optional) The key to fetch.
 */
export function config(k:string):any {
    if (k !== undefined) {
        return cozyState.config[k];
    } else {
        return cozyState.config;
    }
}

/**
 * Get the current platform as a string. Will be either "native" or "web".
 * You can use this to determine whether you should offer desktop-only options
 * (e.g. "quit to desktop").
 */

export function platform():string {
    return cozyState.platform;
}

/**
 * Create and add a Plane to the engine's render stack. The function will
 * return the newly created Plane.
 * @param Type What type of Plane to create; should either be {@link RenderPlane} or {@link UiPlane}.
 * @param args Arguments to pass through to the Plane created.
 */
export function addPlane<p extends Plane>(Type:{new(args:any): p;}, args?:any):p {
    let plane = new Type(args || {});
    cozyState.planes.push(plane);
    
    plane.resize(cozyState.config['width'], cozyState.config['height'], cozyState.sizeMultiplier);

    return plane;
}

/**
 * Pause the engine; when paused, the engine will not call update() on any
 * Planes, and will not call frame() on your game. The engine starts out
 * paused, to ensure the game does not attempt to process things until after
 * loading and initialization is complete.
 */
export function pause() {
    cozyState.paused = true;
}

/**
 * Unpause the engine. See pause().
 */
export function unpause() {
    cozyState.paused = false;
}

/**
 * Get the inner dimensions of the game window; the return value is an array
 * of two numbers, width and height.
 */
function getContentSize():number[] {
    if (cozyState.browserWindow.getContentSize) {
        return cozyState.browserWindow.getContentSize();
    } else {
        return [ window.innerWidth, window.innerHeight ];
    }
}

function fixZoom() {
    let windowSize = getContentSize();
    let mult = cozyState.sizeMultiplier;

    for (let plane of cozyState.planes) plane.resize(cozyState.config['width'], cozyState.config['height'], mult);

    document.body.style.margin = "" + Math.floor((windowSize[1] - mult * cozyState.config['height']) / 2) + "px " + Math.floor((windowSize[0] - mult * cozyState.config['width']) / 2) + "px";
    document.body.style.display = 'none';
    document.body.offsetHeight;
    document.body.style.display = '';
}

function onResize(event?:any) {
    let newSize = getContentSize(),
        multX   = newSize[0] / cozyState.config['width'],
        multY   = newSize[1] / cozyState.config['height'],
        mult    = Math.min(multX, multY);

    if (cozyState.config['integerUpscale'] && mult > 1) {
        mult = Math.floor(mult);
    }

    cozyState.sizeMultiplier = mult;
    fixZoom();
}

/**
 * Set the current zoom of the game window; this is only usable if the game is
 * not configured to use "autoResize". 1 is default, 1:1 zoom; 2.0 will double
 * each pixel, while 0.5 will show the window at half-size.
 * @param z The new zoom level.
 */
export function setZoom(z:number):void {
    if (cozyState.config['autoResize']) {
        throw new Error("Do not call setZoom if the game has autoResize turned on.");
    }
    cozyState.sizeMultiplier = z;
    fixZoom();
}

/**
 * Get the current zoom level of the game window.
 */
export function getZoom() {
    return cozyState.sizeMultiplier;
}

/**
 * Set the title of the game window.
 * @param title The new title.
 */
export function setTitle(title) {
    cozyState.browserWindow.setTitle(title);
}

/**
 * Close the window and quit the game. This may not work as expected when
 * exported for web.
 */
export function quit() {
    cozyState.browserWindow.close();
}

/**
 * Load a list of assets into the engine's texture library. Returns a Promise
 * that resolves when loading is complete.
 * @param assets A map of string keys to file paths.
 */
export function loadTextures(assets):Promise<void> {
    return new Promise((resolve, reject) => {
        if (Object.getOwnPropertyNames(assets).length < 1) {
            resolve();
            return;
        }

        for (let name in assets) {
            let asset = assets[name];
            if (typeof asset === 'string') {
                asset = gameDir().file(asset);
            }
            PIXI.loader.add(name, asset.path);
        }

        PIXI.loader.load(function(loader, resources) {
            for (let key of Object.keys(resources)) {
                let resource = resources[key];
                cozyState.textures[resource['name'].replace(/\\/g, "/")] = new Texture(resource['texture']);
            }
            cozyState.textures = Object.assign(cozyState.textures, cozyState.textures);
            resolve();
        });
    });
}

/**
 * Retrieve a texture that has been loaded into the engine's texture library.
 * @param f Key of the texture used when loaded with {@link loadTextures}.
 */
export function getTexture(f) {
    return cozyState.textures[f.replace(/\\/g, "/")];
}

/**
 * 
 * @param file A loaded {@link File}.
 */
export function addStyleSheet(file:File):Promise<void> {
    return new Promise((resolve, reject) => {
        let el = document.createElement('link');
        el.setAttribute('rel', "stylesheet");
        el.setAttribute('type', "text/css");
        el.setAttribute('href', file.url);
        el.onload = () => resolve();
        document.head.appendChild(el);
    });
}

export function captureScreenshot(width?:number, height?:number):Promise<any> {
    let winSize = getContentSize();
    let w = <number>Math.ceil(cozyState.config['width'] * cozyState.sizeMultiplier);
    let h = <number>Math.ceil(cozyState.config['height'] * cozyState.sizeMultiplier);
    let x = ((winSize[0] - w) / 2) | 0;
    let y = ((winSize[1] - h) / 2) | 0;

    let rect = {
        width: w,
        height: h,
        x: x,
        y: y
    };

    return new Promise((resolve, reject) => {
        // Note that in the Electron case we are returning a NativeImage, and in the
        // browser case we're returning a canvas object. Both of these happen to have
        // the .toDataURL() method, so we're okay~ for SimpleQuest, but this should
        // be revisited.

        if (cozyState.browserWindow.capturePage) {
            cozyState.browserWindow.capturePage(rect, (image) => {
                let opts = {
                    quality: "best"
                };
                if (width !== undefined) opts['width'] = width;
                if (height !== undefined) opts['height'] = height;
                resolve(image.resize(opts));
            });
        } else if (window['html2canvas'] !== undefined) {
            if (!width) width = w;
            if (!height) height = Math.round((h / w) * width);

            let outputcanvas = document.createElement('canvas');
            outputcanvas.setAttribute('width', width.toString());
            outputcanvas.setAttribute('height', height.toString());
            
            // in this case we DO actually want to do resize interpolation
            
            window['html2canvas'](document.body).then((c) => {
                let ctx = outputcanvas.getContext('2d');
                ctx.drawImage(c, x, y, w, h, 0, 0, width, height);
                resolve(outputcanvas);
            });
        } else {
            reject();
        }
    });
}

// TODO fix this; won't work for browser
// export function saveImageToFile(image:any):File {
//     var filename = `${(new Date()).toISOString().replace(/[-T:Z\.]/g,"")}.png`;
//     var file = cozyState.userDataDir.subdir('screenshots', true).file(filename);
//     file.write(image.toPng(), 'binary');
//     return file;
// }

export function writeUserConfig(data:any) {
    let f = new UserdataFile('config.json');
    f.setData(JSON.stringify(data))
    return f.write();
}

export function getFullScreen():boolean {
    if (cozyState.browserWindow.isFullScreen) {
        return cozyState.browserWindow.isFullScreen();
    } else {
        return window.document.body['fullscreenElement'] === null;
    }
}

export function setFullScreen(f:boolean):void {
    if (cozyState.browserWindow.setFullScreen) {
        cozyState.browserWindow.setFullScreen(f);
    } else {
        window.document.body.requestFullscreen();
    }
}

export function getDebug():boolean {
    return cozyState.debug;
}

export function setBackground(color:string) {
    document.body.style.backgroundColor = color;
}

/**
Convert some HTML to use URLs appropriate for displaying. Since the engine considers the engine root directory
to be the root of the HTML document, any references to images, stylesheets, etc must be rewritten.
@param html     The html to fix.
**/

export function fixHTML(html:string):string {
    var el = document.createElement('div');
    el.innerHTML = html;

    var fixElements = [].concat(
        Array.prototype.slice.call(el.getElementsByTagName('link')),
        Array.prototype.slice.call(el.getElementsByTagName('img')),
        Array.prototype.slice.call(el.getElementsByTagName('a'))
    );

    for (let element of fixElements) {
        for (let attr of ['src','href']) {
            if (element.getAttribute(attr)) {
                if (element.getAttribute(attr).indexOf('data') === 0) return;
                element[attr] = cozyState.gameDir.file(element.getAttribute(attr)).url;
            }
        }
    }

    return el.innerHTML;
}

/**
Utility function to calculate a number that "wraps around" within a certain range.
For example, wrap(8, 10) will give you 8, while wrap(12, 10) will give you 2.
@param n        The number to wrap.
@param range    The range of the wrapping.
**/
export function wrap(n:number, range:number) {
    while (n < 0) n += range;
    n %= range;
    return n;
}

let lastID = -1;
export function uniqueID() {
    return (++lastID).toString();
}

let uniqueStrings = {"":true};
let stringChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
export function randomString(len:number):string {
    let s = "";
    while (uniqueStrings[s]) {
        for (let i = 0; i < len; i++) {
            s += stringChars[(Math.random() * stringChars.length) | 0];
        }
    }
    uniqueStrings[s] = true;
    return s;
}

export function after(n, resolution) {
    let count = n;
    return () => {
        count--;
        if (count <= 0) {
            resolution();
        }
    }
}

/**
Take an object, o, and apply a function f to each value in turn. Returns an
object with all the same keys as o, but the result of f for the value of that
key.
@param {object}    o        The input object
@param {function}  f        The function, receives (value, key)
@returns {object}           The new object
**/

export function mapO(o, f) {
    let output = {};
    for (let k in o) {
        output[k] = f(o[k], k);
    }
    return output;
}

/**
Given an array, shuffle the elements of that array in-place and return it.
This is a Fisher-Yates shuffle. https://en.wikipedia.org/wiki/Fisher-Yates_shuffle
@param {array}    a         The array to shuffle
@returns {array}            The array, now shuffled.
**/

export function shuffle(a) {
    let total = a.length;

    for (let pivot = 0; pivot < total; pivot++) {
        let select = (Math.random() * (total - pivot)) | 0;
        let tmp = a[pivot];
        a[pivot] = a[select];
        a[select] = tmp;
    }

    return a;
}

/**
Given a sorted array, a, insert a new element e, into it, in-place. If cmp is
supplied, use it to compare values.
@param {array}    a         The sorted array
@param {any}      e         The new element
@param {function} cmp       Compare function; receives (a,b) and should return negative if a < b, positive if a > b, and 0 if they're equal
**/

export function sortedInsert(a,e,cmp) {
    if (!cmp) cmp = (a,b) => { return a - b; };

    // short circuit some cases so we can assume that the insert is within the
    // array somewhere
    if (a.length < 1 || cmp(e, a[a.length - 1]) >= 0) {
        a.push(e);
        return;
    }
    if (cmp(e,a[0]) < 0) {
        a.unshift(e);
        return;
    }

    let wnd = [1, a.length - 1];

    while (true) {
        let i = (wnd[0] + (wnd[1] - wnd[0]) / 2) | 0;
        if (wnd[1] - wnd[0] === 0) {
            break;
        }

        let c = cmp(e, a[i]);

        if (c >= 0) {
            wnd[0] = i + 1;
        } else {
            wnd[1] = i;
        }
    }

    a.splice(wnd[0], 0, e);
}
