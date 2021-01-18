import * as Cozy from 'Cozy';
import { Input } from 'Cozy';

let ButtonState: Cozy.ButtonState;
let plane:Cozy.RenderPlane;
let layer:Cozy.Layer;
let sprite:Cozy.Sprite;
let map:Cozy.Sprite[];

export function load() {
  return Cozy.loadTextures({
      tileset_1:   "assets/arts/terrain_hextiles_painted_basic_256x384.png"
  });
}

function addTile(x:number, y:number, frame:number) {

    let dx = (x * 256);
    let dy = (y * 256);

    dy -= (y*64);

    if(y%2===1) {
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


const oceanTiles = [4,5,6,7, // ocean
];

const weightedTileIndexArray = [
    4,5,6,7, // ocean
    4,5,6,7, // ocean
    4,5,6,7, // ocean
    4,5,6,7, // ocean
    4,5,6,7, // ocean
    4,5,6,7, // ocean

    4,5,6,7, // ocean
    4,5,6,7, // ocean
    4,5,6,7, // ocean
    4,5,6,7, // ocean
    4,5,6,7, // ocean
    4,5,6,7, // ocean

    4,5,6,7, // ocean
    4,5,6,7, // ocean
    4,5,6,7, // ocean
    4,5,6,7, // ocean
    4,5,6,7, // ocean
    4,5,6,7, // ocean

    0,1,2,3, //grasses
    0,1,2,3, //grasses
    0,1,2,3, //grasses
    0,1,2,3, //grasses

    8,9,10,11, //mountain

    12,13,14,15, // desert

    16,17,18,19, // forest
    16,17,18,19, // forest
    16,17,18,19, // forest

    20,21,22,23, //swamp

    24,25,26,27, //wasteland

    32,33,34,35, // hills
    32,33,34,35, // hills
];

function getBetterTile() {
    return weightedTileIndexArray[Math.floor(Math.random() * Math.floor(weightedTileIndexArray.length))];
}

function getOceanTile() {
    return oceanTiles[Math.floor(Math.random() * Math.floor(oceanTiles.length))];
}

export function start() {
    Cozy.setBackground('#880088');

    map = [];
    plane = Cozy.addPlane(Cozy.RenderPlane, {
        renderable: true
    });

    layer = plane.addRenderLayer();
    
    // layer.add(sprite);

    var y = 0;
    var x = 0;

    /// The worst map generation algo
    for(y=0; y<20; y++) {
        for(x=0; x<30; x++) {

            let tile = (x==0 || y==0 || y==19 || x==29) ? getOceanTile() : getBetterTile();

            addTile(x,y, tile);
        }   
    }

    /// set up game-specific blur/focus handlers
    window.addEventListener('blur', (e) => {
        console.log('main.ts go blurrrrrr');
        isBlur = true;
    });

    window.addEventListener('focus', (e) => {
        console.log('main.ts focus.  FOCUS!');
        isBlur = false;
        isBlurSkipFrame = true;
    });
    
    Cozy.unpause();
}

let isBlur = false;
let isBlurSkipFrame = false;

// this will run every frame
// - dt is the number of seconds that have passed since the last frame
export function frame(dt) {

    /// TODO: maybe shadowbox if blurred?
    if(isBlur) {
        return;
    }

    if(isBlurSkipFrame) {
        isBlurSkipFrame = false;
    } else {
        if( Cozy.Input.mouseInfo().buttons[0] === 1 ) { // enum Down.  Hopw do we expose the good enum here? >:()
            let dx = Cozy.Input.mouseInfo().dx;
            let dy = Cozy.Input.mouseInfo().dy;
            
            layer.adjustPosition(dx, dy);
        }
    }


}

