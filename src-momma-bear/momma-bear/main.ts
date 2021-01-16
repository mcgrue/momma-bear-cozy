import * as Cozy from 'Cozy';
import { Input } from 'Cozy';

let ButtonState: Cozy.ButtonState;
let plane:Cozy.RenderPlane;
let layer:Cozy.Layer;
let sprite:Cozy.Sprite;

export function load() {
  return Cozy.loadTextures({
      tileset_1:   "assets/arts/terrain_hextiles_painted_basic_256x384.png"
  });
}

export function start() {
    Cozy.setBackground('#880088');

    plane = Cozy.addPlane(Cozy.RenderPlane, {
        renderable: true
    });

    let layer = plane.addRenderLayer();
    sprite = new Cozy.Sprite({
        texture: 'tileset_1',
        position: { x: 50, y: 50 },
    });
    layer.add(sprite);
    Cozy.unpause();
}

export function frame(dt) {
    // this will run every frame
    // - dt is the number of seconds that have passed since the last frame

    if( Cozy.Input.mouseInfo().buttons[0] === 1 ) { // enum Down.  Hopw do we expose the good enum here? >:()
        let dx = Cozy.Input.mouseInfo().dx;
        let dy = Cozy.Input.mouseInfo().dy;
        
        sprite.adjustPosition(dx, dy);
        console.log(`BOOP ${dx} ${dy}`);
    } else {
        console.log("UNBOOP");
    }
    
}

