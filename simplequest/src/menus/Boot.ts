module SimpleQuest {
    export module Menu {
        export class Boot extends RPG.Menu {
            constructor() {
                super({
                    className: 'menu boot-menu',
                    html: `
                        <h1>Simple Quest</h1>
                        <ul class="selections">
                            <li class="loadlast"  data-menu="loadlast">Continue</li>
                            <li class="new"       data-menu="newGame">New Game</li>
                            <li class="load"      data-menu="loadGame">Load Game</li>
                            <li class="options"   data-menu="options">Options</li>
                            <li class="exit"      data-menu="exit">Exit</li>
                        </ul>
                    `
                });

                if (RPG.SavedGame.count() < 1) {
                    this.find('li.loadlast').remove();
                    this.find('li.load').remove();
                }

                this.setupSelections(this.find('.selections'));
            }

            newGame() {
                this.pause();
                RPG.Scene.do(function*() {
                    RPG.sfx['menu_newgame'].play();
                    yield* RPG.Scene.waitFadeTo("black", 1.0);
                    RPG.Menu.pop();
                    this.remove();
                    SimpleQuest.newGame();
                }.bind(this))
            }

            loadlast() {
                SimpleQuest.loadGame(RPG.SavedGame.getList()[0]);
            }

            loadGame() {
                console.log("TODO open load game menu");
            }

            options() {
                console.log("TODO open options menu");
            }

            exit() {
                SimpleQuest.Menu.quitGame();
            }
        }
    }
}
