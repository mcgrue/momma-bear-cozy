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

export function start() {
    Cozy.setBackground('#880088');

    map = [];
    plane = Cozy.addPlane(Cozy.RenderPlane, {
        renderable: true
    });

    layer = plane.addRenderLayer();
    
    // layer.add(sprite);

    addTile(0,0,0);
    addTile(1,0,1);
    addTile(2,0,2);
    addTile(3,0,3);

    addTile(0,1,4);
    addTile(1,1,5);
    addTile(2,1,6);
    addTile(3,1,7);

    addTile(0,2,8);
    addTile(1,2,9);
    addTile(2,2,10);
    addTile(3,2,11);
    
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

