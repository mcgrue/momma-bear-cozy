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
            addTile(x,y, Math.floor(Math.random() * Math.floor(39)));
        }   
    }
    
    Cozy.unpause();
}

export function frame(dt) {
    // this will run every frame
    // - dt is the number of seconds that have passed since the last frame

    if( Cozy.Input.mouseInfo().buttons[0] === 1 ) { // enum Down.  Hopw do we expose the good enum here? >:()
        let dx = Cozy.Input.mouseInfo().dx;
        let dy = Cozy.Input.mouseInfo().dy;
        
        layer.adjustPosition(dx, dy);
        console.log(`BOOP ${dx} ${dy}`);
    } else {
        console.log("UNBOOP");
    }
    
}

