namespace RPG {
    export class Item {
        static load(items:any) {
            _.each(items, (def:any, key:string) => {
                RPG.items[key] = new Item(key, def);
            });
        }

        static lookup(key:string) {
            if (RPG.items[key]) {
                return RPG.items[key];
            }
            console.warn("! Tried to look up bad item '" + key + "'");
        }

        key:string;
        sort:number;
        name:string;
        price:number;
        icon:string;
        iconFrame:any;
        description:string;
        useEffect:any;
        canStack:boolean;
        equipSlot:string;
        equipEffect:any;

        constructor(key:string, def:any) {
            this.key = key;
            this.sort = def.sort;

            this.icon = Egg.File.urlPath(def.icon);
            this.iconFrame = def.icon_frame;
            this.name = def.name;
            this.description = def.description;
            this.canStack = !!def.canStack;

            this.price = def.price || 1;

            this.equipSlot = def.slot;
            this.equipEffect = def.equip;
            this.useEffect = def.use;
        }

        get effectSummary() {
            return '';
        }

        get iconHTML() {
            var style = `background-image:url(${this.icon});`;
            style += this.iconFrame ? `background-position: -${this.iconFrame.x}px -${this.iconFrame.y}px` : '';
            return `<span class="item-icon" style="${style}"></span>`
        }

        makeIcon(element:HTMLElement) {
            element.style.backgroundImage = "url(" + this.icon + ")";
            if (this.iconFrame) {
                element.style.backgroundPosition = "-" + this.iconFrame.x + "px -" + this.iconFrame.y + "px";
            }
        }

        // deprecate
        makeIconString() {
            var container = document.createElement('div');
            var icon = document.createElement('span');
            icon.classList.add('item-icon');
            this.makeIcon(icon);
            container.appendChild(icon);
            return container.innerHTML;
        }

        canUse(character:RPG.Character, target:RPG.Character) {
            if (!this.useEffect) return false;
            switch (this.useEffect._target) {
                case 'self':
                    return true;
                // TODO
            }

            return false;
        }

        activate(character:RPG.Character) {
            if (!this.useEffect) return;
            _.each(this.useEffect, (params:any, effect:string) => {
                if (effect === '_target') return;

                if (RPG.Effect[effect]) {
                    var args = params.slice(0);
                    args.unshift(character);
                    args.unshift(this);

                    if (RPG.Effect[effect].apply(undefined, args)) {
                        Party.removeItem(this.key, 1);
                    }
                } else {
                    console.warn("! Bad effect", effect, "triggered from", this.key);
                }
            })
        }
    }
}
