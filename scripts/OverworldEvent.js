class OverworldEvent {
    constructor({ map, event}) {
        this.map = map;
        this.event = event;
    }

    stand(resolve) {
        const who = this.map.gameObjects[this.event.who];
        who.startBehavior({
            map : this.map
        }, {
            type: "stand",
            direction: this.event.direction,
            time: this.event.time
        });

        const completeHandler = e => {
            if (e.detail.whoId === this.event.who) {
                document.removeEventListener("PersonStandingComplete", completeHandler);
                resolve();
            }
        }

        document.addEventListener("PersonStandingComplete", completeHandler)

    }

    walk(resolve) {
        const who = this.map.gameObjects[this.event.who];
        who.startBehavior({
            map : this.map
        }, {
            type: "walk",
            direction: this.event.direction,
            time: this.event.time
        });

        const completeHandler = e => {
            if (e.detail.whoId === this.event.who) {
                document.removeEventListener("PersonWalkingComplete", completeHandler);
                resolve();
            }
        }

        document.addEventListener("PersonWalkingComplete", completeHandler)
    }

    textMessage(resolve) {
        const message = new TextMessage({
            text: this.event.text,
            onComplete: () => resolve()
        });
        message.init( document.querySelector(".game-container") );
    }

    changeMap(resolve) {

        const sceneTransition = new SceneTransition();
        sceneTransition.init(document.querySelector(".game-container"), () => {
            this.map.overworld.startMap(this.event.map, this.map.overworld.progress.mapLevel );
            resolve();
            sceneTransition.fadeOut();
        });
    }

    itemPicked(resolve) {
        const who = this.map.gameObjects[this.event.who];
        who.pickedUp(this.map, resolve());
    }

    hidingToggle(resolve) {
        const who = this.map.gameObjects[this.event.who];
        who.startBehavior({
            map : this.map
        }, {
            type: "hide"
        });

        const completeHandler = e => {
            if (e.detail.whoId === this.event.who) {
                document.removeEventListener("PersonHidingComplete", completeHandler);
                resolve();
            }
        }

        document.addEventListener("PersonHidingComplete", completeHandler)
    }

    removeObject(resolve) {
        const who = this.map.gameObjects[this.event.who];

        if (this.event.object === null || (this.map.overworld.inventory && this.map.overworld.inventory.id === this.event.object)) {
            if (this.event.who === "fridge") {
                this.map.gameObjects["sleeping_state"] = new GameObject({ src: "assets/images/characters/invisible_guy.png" });
                this.map.gameObjects["sleeping_state"].id = "sleeping_state";
            }

            who.remove(this.map);

            if (this.event.object !== null) {
                this.map.overworld.inventory = null;
            }

            resolve();
        }
        else {
            this.textMessage(resolve);
        }
    }

    addObject(resolve) {
        this.map.gameObjects[this.event.name] = this.event.inside;
        this.map.gameObjects[this.event.name].id = this.event.name;
        resolve();
    }

    checkChange(resolve) {
        const who = this.map.gameObjects[this.event.who];

        if (this.map.gameObjects[this.event.object] !== undefined) {
            this.map.startNonCutscene(this.event.additions);
        }
        resolve();
    }

    setSleeping(resolve) {
        const who = this.map.gameObjects[this.event.who];
        who.isSleeping = true;
        resolve();
    }

    imageChangeSrc(resolve) {
        const who = this.map.gameObjects[this.event.who] || this.map.VNCharacters.gf;
        console.log(who);
        who.imageChangeSrc(this.event.src);
        resolve();
    }

    levelChange(resolve) {
        this.map.overworld.progress.mapLevel += 1;
        if (this.map.overworld.progress.mapLevel === 5) {
            this.map.overworld.progress.mapLevel = 0;
        }
        resolve();
    }

    playScare(resolve) {
        this.map.overworld.scareChangeSrc(this.event.src);
        resolve();
    }

    init() {
        return new Promise(resolve => {
            this[this.event.type](resolve);
        });
    }

}
