module Egg {
    export class Layer {
        innerContainer: PIXI.Container;
        sprites: Array<Egg.Sprite>;

        constructor() {
            this.sprites = [];
            this.innerContainer = new PIXI.Container();
        }

        update(dt:number):void {
            this.sprites.forEach(function(s) {
                s.update(dt);
            });
        }

        add(thing:any) {
            if (thing instanceof Sprite) {
                this.sprites.push(thing);
                this.innerContainer.addChild(thing.innerSprite);
            }
        }

        remove(sp:Sprite) {
            var index = this.sprites.indexOf(sp);
            if (index !== -1) {
                this.sprites.splice(index, 1);
            }
            this.innerContainer.removeChild(sp.innerSprite);
        }

        clear() {
            this.sprites.forEach(function() {
                this.innerContainer.removeChild(this.sprites[0].innerSprite);
            }.bind(this));
        }
    }
}
