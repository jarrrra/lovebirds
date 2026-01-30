class GameObject {
    constructor(config) {
        this.id = null;
        this.item = false;
        this.isMounted = false;
        this.x = config.x || 0;
        this.y = config.y || 0;
        this.startPosition = { x : config.x || 0, y : config.y || 0 };
        this.returnAfterChase = config.returnAfterChase || false;

        this.width = config.width || 32;
        this.height = config.height || 32;
        this.direction = config.direction || "down";
        this.sprite = new Sprite({
            gameObject: this,
            src: config.src || "assets/images/characters/mc.png",
            animations: {
                "idle": [
                    [0, 0]
                ],
            },
            currentAnimation: "idle",
            width: this.width,
            height: this.height
        });

        this.isHidden = config.isHidden || false;

        this.behaviorLoop = config.behaviorLoop || {};
        this.behaviorLoopIndex = 0;

        this.talking = config.talking || [];
    }

    mount(map) {
        this.isMounted = true;

        map.addWall(this.x, this.y);

        setTimeout(() => {
            this.doBehaviourEvent(map);
        }, 10);
    }

    remove(map, who) {
        map.removeWall(this.x, this.y);
        delete map.gameObjects[this.id];
    }

    imageChangeSrc(src) {
        this.sprite.src = src;
    }

    update() {

    }

    async doBehaviourEvent(map) {
        if (map.isCutscenePlaying || this.behaviorLoop.length === undefined || this.isStanding || this.chase || this.isSleeping) {
            return;
        }

        let eventConfig = this.behaviorLoop[this.behaviorLoopIndex];
        eventConfig.who = this.id;
        this.startPosition = { x : this.x, y : this.y };

        const eventHandler = new OverworldEvent({ map, event : eventConfig });
        await eventHandler.init();

        this.behaviorLoopIndex += 1;
        if (this.behaviorLoopIndex === this.behaviorLoop.length) {
            this.behaviorLoopIndex = 0;
        }

        this.doBehaviourEvent(map);
    }

}
