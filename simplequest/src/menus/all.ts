///<reference path="Boot.ts"/>
///<reference path="Main.ts"/>

module SimpleQuest {
    export module Menu {
        export function quitGame() {
            RPG.Scene.do(function*() {
                yield* RPG.Scene.waitFadeTo("black", 1.0);
                Egg.quit();
            }.bind(this));
        }
    }
}
