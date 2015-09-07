module Egg {
    export class Sprite {
        texture: PIXI.Texture;
        textureFrame: PIXI.Rectangle;
        innerSprite: PIXI.Sprite;
        hotspot: PIXI.Point;
        position: PIXI.Point;
        frameSize: PIXI.Point;
        frameCounts: PIXI.Point;

        animations: {};
        currentAnimation: {};
        animationScratch: {};
        frameRate: number;

        /**
            constructor args: {
                - required -
                texture: <Texture>/<string>

                - optional -
                hotspot: { x: <Number>, y: <Number> },
                position: { x: <Number>, y: <Number> },
                frameSize: { x: <Number>, y: <Number> },
                animations: { <key>: <animationDef>, ... },
                currentAnimation: <string>,
                frameRate: <number>
            }
        **/
        constructor(args) {
            if (!args.texture) throw new Error("Sprite must be instantiated with a 'texture'");

            args.hotspot = args.hotspot || {};
            args.position = args.position || {};
            args.frameSize = args.frameSize || {};

            if (typeof args.texture === 'string') {
                args.texture = Egg.textures[args.texture];
            }
            this.texture = new PIXI.Texture(args.texture.innerTexture);
            this.innerSprite = new PIXI.Sprite(this.texture);

            this.hotspot = new PIXI.Point(args.hotspot.x || 0, args.hotspot.y || 0);
            this.position = new PIXI.Point(args.position.x || 0, args.position.y || 0 );
            this.frameSize = new PIXI.Point(args.frameSize.x || args.texture.width, args.frameSize.y || args.texture.height);
            this.textureFrame = new PIXI.Rectangle(0, 0, this.frameSize.x, this.frameSize.y);
            this.frameCounts = new PIXI.Point(Math.floor(this.texture.width / this.frameSize.x), Math.floor(this.texture.height / this.frameSize.y));
            this.texture.frame = this.textureFrame;

            this.animations = args.animations || {};
            this.frameRate = args.frameRate || 60;
            if (args.currentAnimation) {
                this.animation = args.currentAnimation;
            }

            this.positionInnerSprite();
        }

        set frame(f:number) {
            this.textureFrame.x = this.frameSize.x * (f % this.frameCounts.x);
            this.textureFrame.y = this.frameSize.y *  Math.floor(f / this.frameCounts.y);
            this.texture.frame = this.textureFrame;
        }

        set animation(anim:any) {
            if (this.animations[anim]) {
                this.currentAnimation = this.animations[anim];
                this.animationScratch = {
                    counter: 0,
                    lastFrame: null
                };
            } else {
                this.currentAnimation = null;
                this.animationScratch = null;
            }
        }

        update(dt):void {
            if (this.currentAnimation) {
                this.animationScratch['counter'] += (dt * this.frameRate);
                var f = Math.floor(this.animationScratch['counter']);

                if (!this.currentAnimation['loop'] && f >= this.currentAnimation['frames'].length) {
                    this.animation = null;
                } else {
                    f = f % this.currentAnimation['frames'].length;

                    if (this.animationScratch['lastFrame'] !== f) {
                        this.frame = this.currentAnimation['frames'][f];
                        this.animationScratch['lastFrame'] = f;
                    }
                }
            }
        }

        setPosition(x:number, y:number):void {
            this.position.x = x;
            this.position.y = y;
            this.positionInnerSprite();
        }

        adjustPosition(x:number, y:number):void {
            this.position.x += x;
            this.position.y += y;
            this.positionInnerSprite();
        }

        overlaps(sp:Sprite):Boolean {
            var me = {
                left: this.innerSprite.position.x,
                right: this.innerSprite.position.x + this.innerSprite.width,
                top: this.innerSprite.position.y,
                bottom: this.innerSprite.position.y + this.innerSprite.height
            };
            var them = {
                left: sp.innerSprite.position.x,
                right: sp.innerSprite.position.x + sp.innerSprite.width,
                top: sp.innerSprite.position.y,
                bottom: sp.innerSprite.position.y + sp.innerSprite.height
            }

            return (
                me.left < them.right
                && me.right > them.left
                && me.top < them.bottom
                && me.bottom > them.top
            );
        }

        private positionInnerSprite():void {
            this.innerSprite.x = Math.floor(this.position.x - this.hotspot.x);
            this.innerSprite.y = Math.floor(this.position.y - this.hotspot.y);
        }
    }
}
