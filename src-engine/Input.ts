import { mapO } from './Engine';

export enum ButtonState { UP, DOWN, IGNORED };
type Dict<T> = { [key:string]: T };

class Device {
    public buttonMap: { [key:number]:string[] } = {};
    public axisMap: { [key:number]:string[] } = {};

    constructor(buttonMap?:{[name:string]:Array<number>}, axisMap?:{[name:string]:Array<number>}) {
        if (buttonMap) {
            for (let button in buttonMap) {
                for (let id of buttonMap[button]) {
                    if (!this.buttonMap.hasOwnProperty(id.toString())) this.buttonMap[id.toString()] = [];
                    this.buttonMap[id].push(button);
                }
            }
        }
        if (axisMap) {
            console.log(axisMap);
            for (let axis in axisMap) {
                for (let id of axisMap[axis]) {
                    if (!this.axisMap.hasOwnProperty(id.toString())) this.axisMap[id.toString()] = [];
                    this.axisMap[id].push(axis);
                }
            }
        }
    }

    // override for each device
    getButtonState():{[name:string]:number} { return {}; }
    getAxisState():{[name:string]:number} { return {}; }
    clear():void { /* override */ }
}

class KeyboardDevice extends Device {
    private pressed:any;
    private keys:any;

    constructor(buttonMap:{[name:string]:Array<number>}) {
        super(buttonMap);
        this.pressed = {};
        this.keys = {};

        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('keyup', (e) => this.onKeyUp(e));
    }

    onKeyDown(event) {
        var keyCode = event.keyCode;

        if (this.keys[keyCode]) return;

        this.keys[keyCode] = true;

        if (this.buttonMap.hasOwnProperty(keyCode)) {
            for (let b of this.buttonMap[keyCode]) {
                this.pressed[b] = this.pressed[b] ? this.pressed[b] + 1 : 1;
            }
        }
    }

    onKeyUp(event) {
        var keyCode = event.keyCode;
        this.keys[keyCode] = false;

        if (this.buttonMap.hasOwnProperty(keyCode)) {
            for (let b of this.buttonMap[keyCode]) {
                this.pressed[b]--;
                if (this.pressed[b] === 0) {
                    delete this.pressed[b];
                }
            }
        }
    }

    getButtonState():{[name:string]:number} {
        return mapO(this.pressed, (o) => 1.0);
    }

    clear() {
        this.pressed = {};
    }
}

class GamepadDevice extends Device {
    index:number;

    constructor(index:number, buttonMap?:{[name:string]:Array<number>}, axisMap?:{[name:string]:Array<number>}) {
        super(buttonMap, axisMap);
        this.index = index;
    }

    getButtonState():{[name:string]:number} {
        var pad = navigator.getGamepads()[this.index];
        if (!pad) {
            return;
        }
        var state:{[name:string]:number} = {};
        for (let id in pad.buttons) {
            let button = pad.buttons[id];
            if (button.pressed && this.buttonMap.hasOwnProperty(id.toString())) {
                for (let b of this.buttonMap[id]) {
                    state[b] = Math.max(state[b] || 0, button.value);
                }
            }
        }
        return state;
    }

    getAxisState():{[name:string]:number} {
        var pad = navigator.getGamepads()[this.index];
        var state:{[name:string]:number} = {};
        var count:{[name:string]:number} = {};

        for (let axisIndex in pad.axes) {
            let d = pad.axes[axisIndex];
            if (Math.abs(d) < Input.deadzone) continue;
            if (this.axisMap.hasOwnProperty(axisIndex.toString())) {
                for (let axisName of this.axisMap[axisIndex]) {
                    count[axisName] = (count[axisName] || 0) + 1;
                    state[axisName] = (state[axisName] || 0) + d;
                }
            }
        }
        return mapO(state, (v, k) => v / count[k]);
    }
}

export class Input {
    public static deadzone:number = 0.25;
    private static buttonMap: { [key:number]:string[] };
    private static button:Dict<ButtonState>;
    private static axes:Dict<number>;
    private static buttonTimeouts:Dict<number>;
    private static callbacks:Dict<Array<any>>;
    private static devices:Array<Device>;
    private static controlConfig:Dict<any>;
    private static _mouseInfo:Dict<any>;
    private static _mousemoveEvent:any;

    static init(controls?:{ [name:string]: any }) {
        debugger;
        this.axes = {};
        this.button = {};
        this.buttonMap = {};
        this.buttonTimeouts = {};
        this.callbacks = {};
        this.devices = [];

        window.addEventListener("gamepadconnected", (evt) => {
            let gamepad = navigator.getGamepads()[evt['gamepad'].index];
            console.log("CONNECTED ->", evt['gamepad'], gamepad);
            if (gamepad && gamepad.connected && gamepad.id.match(/XInput STANDARD GAMEPAD/)) {
                this.addGamepad(gamepad.index);
            }
        });
        for (let gamepad of navigator.getGamepads()) {
            console.log("PRE-CONNECTED ->", gamepad);
            if (gamepad && gamepad.connected && gamepad.id.match(/XInput STANDARD GAMEPAD/)) {
                this.addGamepad(gamepad.index);
            }
        }

        window.addEventListener('gamepaddisconnected', (evt) => {
            console.log("Lost gamepad", evt['gamepad']);
        });

        this.controlConfig = controls || {};
        this.addKeyboard();

        if (this.controlConfig['mouse']) {
            this.addMouse();
        }
    }

    static update(dt) {
        if (!document.hasFocus()) return;

        let buttonState = {};
        let axisState = {};

        for (let device of Input.devices) {
            Object.assign(buttonState, device.getButtonState());
            let deviceAxis = device.getAxisState();
            for (let id in deviceAxis) {
                axisState[id] = axisState[id] || [];
                axisState[id].push(deviceAxis[id]);
            }
        }

        for (let a of Object.keys(this.axes)) {
            if (axisState[a]) {
                this.axes[a] = axisState[a].reduce((acc:number, x:number) => acc + x) / axisState[a].length;
                buttonState[`${a}+`] = this.axes[a] > 0 ? 1 : 0;
                buttonState[`${a}-`] = this.axes[a] < 0 ? 1 : 0;
            } else {
                this.axes[a] = 0.0;
                buttonState[`${a}+`] = 0;
                buttonState[`${a}-`] = 0;
            }
        }

        for (let b in this.button) {
            let state = this.button[b];
            if (state !== ButtonState.IGNORED && buttonState[b] > Input.deadzone) {
                this.button[b] = ButtonState.DOWN;
                var eventInfo = { button: b, pressed: true };
                this.triggerCallbacks(b, eventInfo);
                this.triggerCallbacks(b + ".down", eventInfo);
            } else if (state !== ButtonState.UP && (!buttonState[b] || buttonState[b] < Input.deadzone)) {
                this.button[b] = ButtonState.UP;
                var eventInfo = { button: b, pressed: false };
                this.triggerCallbacks(b, eventInfo);
                this.triggerCallbacks(b + ".up", eventInfo);
                clearTimeout(this.buttonTimeouts[b]);
            }
        }

        if (Input._mouseInfo) {
            if (Input._mousemoveEvent) {
                Input._mouseInfo.dx = Input._mousemoveEvent.clientX - Input._mouseInfo.x;
                Input._mouseInfo.dy = Input._mousemoveEvent.clientY - Input._mouseInfo.y;
                Input._mouseInfo.x = Input._mousemoveEvent.clientX;
                Input._mouseInfo.y = Input._mousemoveEvent.clientY;
            } else {
                Input._mouseInfo.dx = 0;
                Input._mouseInfo.dy = 0;
            }
            Input._mousemoveEvent = null;
        }
    }

    static clear() {
        this.devices.forEach((d) => d.clear());
    }

    static on(eventName, cb, ctx) {
        var events:Array<string> = eventName.split(' ');
        for (let e of events) {
            if (!this.callbacks[e]) this.callbacks[e] = [];
            this.callbacks[e].push({ callback: cb, context: ctx }) - 1;
        }
    }

    static off(eventName, cb, ctx) {
        var clearEvent = (name) => {
            this.callbacks[name] = this.callbacks[name].filter((ev) => {
                if (ev.context === ctx && (cb === undefined || ev.callback === cb)) {
                    return false;
                }
                return true;
            });
        }

        if (eventName === undefined) {
            Object.keys(this.callbacks).forEach(clearEvent);
        } else {
            var events = eventName.split(' ');
            events.forEach(clearEvent);
        }
    }

    // TODO add ability to map mouse buttons to logical buttons
    // TODO add ability to map mouse dx/dy to an axis??
    private static addMouse() {
        Input._mouseInfo = {
            x: 0,
            y: 0,
            dx: 0,
            dy: 0,
            buttons: [
                ButtonState.UP, ButtonState.UP, ButtonState.UP,
                ButtonState.UP, ButtonState.UP
            ]
        };
        window.addEventListener('mousemove', (e) => {
            Input._mousemoveEvent = e;
        });
        window.addEventListener('mousedown', (e) => {
            Input._mouseInfo.buttons[e.button] = ButtonState.DOWN;
        });
        window.addEventListener('mouseup', (e) => {
            Input._mouseInfo.buttons[e.button] = ButtonState.UP;
        });
    }

    static mouseInfo() {
        return Input._mouseInfo;
    }

    private static addKeyboard() {
        var b, buttons = this.controlConfig['keyboard'];

        if (buttons) {
            b = mapO(buttons, (v) => typeof v === 'number' ? [v] : v);
        } else {
            b = {
                "left": [37],        // left arrow
                "up": [38],          // up arrow
                "right": [39],       // right arrow
                "down": [40],        // down arrow

                "confirm": [32,88],  // space, x
                "cancel": [18,90],   // alt, z
                "menu": [27]         // esc
            };
        }

        for (let buttonName of Object.keys(b)) {
            if (!this.button.hasOwnProperty(buttonName)) {
                this.button[buttonName] = ButtonState.UP;
            }
        }

        console.log("keyboard map:", b);
        this.devices.push(new KeyboardDevice(b));
    }

    private static addGamepad(index) {
        var a:{[name:string]: number[]};
        var b:{[name:string]: number[]};

        b = {
            "left": [14], // d-pad left
            "up": [12], // d-pad up
            "right": [15], // d-pad right
            "down": [13], // d-pad down

            "confirm": [0, 2], // A, X
            "cancel": [1], // B
            "menu": [3, 9] // Y, "start"
        };

        for (let buttonName of Object.keys(b)) {
            if (!this.button.hasOwnProperty(buttonName)) {
                this.button[buttonName] = ButtonState.UP;
            }
        }

        a = {
            "horizontal": [0, 2], // left-stick horiz, right-stick horiz
            "vertical": [1, 3] //left-stick vert, right-stick vert
        };

        for (let axisName of Object.keys(a)) {
            if (!this.axes.hasOwnProperty(axisName)) {
                this.axes[axisName] = 0.0;
                this.button[`${axisName}+`] = ButtonState.UP;
                this.button[`${axisName}-`] = ButtonState.UP;
            }
        }

        this.devices.push(new GamepadDevice(index, b, a));
    }

    private static triggerCallbacks(eventName, eventInfo) {
        if (!this.callbacks[eventName]) return;
        for (let ev of this.callbacks[eventName]) {
            ev.callback(eventInfo);
        }
    }

    static pressed(name):Boolean {
        if (name.startsWith('mouse.')) {
            let n = parseInt(name.substr(6), 10);
            return this._mouseInfo.buttons[n] === ButtonState.DOWN;
        }
        return (this.button[name] === ButtonState.DOWN);
    }

    static axis(name):number {
        return this.axes[name];
    }

    static debounce(names:string, duration?:number) {
        var nameList:Array<string> = names.split(" ");
        for (let name of nameList) {
            if (this.button[name] === ButtonState.DOWN) {
                this.button[name] = ButtonState.IGNORED;
                if (duration !== undefined) {
                    this.buttonTimeouts[name] = window.setTimeout(function() {
                        this.button[name] = ButtonState.DOWN;

                        var eventInfo = { button: name, pressed: true };
                        this.triggerCallbacks(name, eventInfo);
                        this.triggerCallbacks(name + ".down", eventInfo);
                    }.bind(this), duration * 1000);
                }
            }
        }
    }
}
