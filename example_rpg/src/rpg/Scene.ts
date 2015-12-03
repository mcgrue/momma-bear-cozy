module RPG {
    enum WaitType { Time, Button, FadeOut, FadeIn };
    class Wait {
        type:WaitType;
        promise:Promise<any>;
        args:any;
        resolve:any;

        constructor(type:WaitType, args:any) {
            this.type = type;
            this.args = args;

            this.promise = new Promise(function(resolver, rejecter) {
                this.resolve = resolver;
            }.bind(this));
        }
    }

    export class Scene {
        static currentScene:Scene;

        private static promise:Promise<any> = null;
        private static restoreControls:RPG.ControlMode;
        private static waits:Wait[] = [];
        private static fadeLayer:HTMLElement;

        static start() {
            if (!this.fadeLayer) {
                this.fadeLayer = document.createElement('div');
                this.fadeLayer.style.height = "100%";
                this.fadeLayer.style.position = "absolute"
                this.fadeLayer.style.top = "0px";
                this.fadeLayer.style.left = "0px";
                this.fadeLayer.style.width = "100%";
                this.fadeLayer.style.height = "100%";
                this.fadeLayer.style.opacity = '0';
            }
            Egg.overlay.ui.appendChild(this.fadeLayer);

            this.promise = new Promise(function(resolve, reject) {
                RPG.player.sprite.animation = "stand_" + RPG.player.dir;
                this.restoreControls = RPG.controls;
                this.currentScene = this;
                RPG.controls = RPG.ControlMode.Scene
                resolve();
            }.bind(this));
            return this.promise;
        }

        static finish() {
            RPG.controls = this.restoreControls;
            this.currentScene = null;
            this.waits = [];

            this.fadeLayer.style.opacity = '0';
            this.fadeLayer.remove();
        }

        static update(dt:number) {
            var remove:number[] = [];
            _.each(this.waits, function(wait:Wait, index:number):void {
                switch(wait.type) {
                    case WaitType.Time:
                        wait.args.passed += dt;
                        if (wait.args.passed >= wait.args.delay) {
                            wait.resolve();
                            remove.push(index);
                        }
                        break;
                    case WaitType.Button:
                        if (Egg.button(wait.args.which)) {
                            Egg.debounce(wait.args.which);
                            wait.resolve();
                            remove.push(index);
                        }
                        break;
                    case WaitType.FadeOut:
                        wait.args.passed += dt;
                        if (wait.args.passed >= wait.args.delay) {
                            this.fadeLayer.style.opacity = '1';
                            wait.resolve();
                            remove.push(index);
                        } else {
                            this.fadeLayer.style.opacity = '' + (wait.args.passed / wait.args.delay);
                        }
                        break;
                    case WaitType.FadeIn:
                        wait.args.passed += dt;
                        if (wait.args.passed >= wait.args.delay) {
                            this.fadeLayer.style.opacity = '0';
                            wait.resolve();
                            remove.push(index);
                        } else {
                            this.fadeLayer.style.opacity = '' + (1 - (wait.args.passed / wait.args.delay));
                        }
                        break;
                }
            }.bind(this));
            _.each(remove.reverse(), function(index:number) {
                this.waits.splice(index, 1);
            }.bind(this));
        }

        private static addWait(type:WaitType, args:any) {
            var w = new Wait(type,args);
            this.waits.push(w);
            return w.promise;
        }

        static waitForTime(t:number) {
            return this.addWait(WaitType.Time, { passed:0, delay:t });
        }

        static waitForButton(b:string) {
            return this.addWait(WaitType.Button, { which:b })
        }

        static waitForFadeOut(duration:number, color?:string) {
            this.fadeLayer.style.opacity = '0';
            this.fadeLayer.style.backgroundColor = color || "black";
            return this.addWait(WaitType.FadeOut, { passed:0, delay:duration });
        }

        static waitForFadeIn(duration:number, color?:string) {
            this.fadeLayer.style.opacity = '1';
            this.fadeLayer.style.backgroundColor = color || "black";
            return this.addWait(WaitType.FadeIn, { passed:0, delay:duration });
        }
    }
}
