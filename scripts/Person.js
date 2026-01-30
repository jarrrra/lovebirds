class Person extends GameObject {
    constructor(config) {
        super(config);
        this.movingProgressRemaining = 0;
        this.isStanding = false;

        this.isPlayerControlled = config.isPlayerControlled || false;

        this.movementSpeed = 1;

        this.allDirections = ["up", "down", "left", "right"];
        this.directionUpdate = {
            "up" : ["y", -this.movementSpeed],
            "down" : ["y", this.movementSpeed],
            "left" : ["x", -this.movementSpeed],
            "right" : ["x", this.movementSpeed]
        }
        this.sprite = new Sprite({
            gameObject: this,
            src: config.src || "./assets/images/characters/mc.png",
        });

        this.footsteps = new Audio("./assets/sounds/sfx/footsteps.mp3");

        this.savedDirection = "right";
        this.isEnemy = config.isEnemy || false;
        this.chase = false;

        this.isSleeping = false;
        this.sleepTimer = 0;
        this.sleepTime = 18000;
    }

    chasePath(state, dir, distX, distY) {
        switch (dir) {
            case "left":
                return 1*!state.map.isSpaceTaken(this.x, this.y, "left", 1) &&
                    (1*(distX <= 0) + Math.abs(distX));

            case "right":
                return 1*!state.map.isSpaceTaken(this.x, this.y, "right", 1) &&
                    (1*(distX >= 0) + Math.abs(distX));

            case "up":
                return 1*!state.map.isSpaceTaken(this.x, this.y, "up", 1) &&
                    (1*(distY <= 0) + Math.abs(distY));

            case "down":
                return 1*!state.map.isSpaceTaken(this.x, this.y, "down", 1) &&
                    (1*(distY >= 0) + Math.abs(distY));
        }

    }

    update(state) {
        if (this.isSleeping) {
            this.updateSprite(state);
            this.sleepTimer += 1;

            if (this.sleepTimer === this.sleepTime) {
                this.sleepTimer = 0;
                this.isSleeping = false;
            }

            return;
        }

        if (this.isEnemy) {
            state.map.checkForEnemyClose(this);
        }

        if (this.chase && !state.map.isCutscenePlaying) {
            if (state.map.gameObjects.hero.isHidden) {
                this.chase = false;
                return this.doBehaviourEvent(state.map);
            }

            const distX = state.map.gameObjects.hero.x - this.x;
            const distY = state.map.gameObjects.hero.y - this.y;

            if (Math.abs(distX) <= 16 && Math.abs(distY) <= 16) {
                this.chase = false;
                return state.map.enemyJumpscare();
            }

            let checkLeft = 0;
            let checkRight = 0;
            let checkUp = 0;
            let checkDown = 0;


            if (this.movingProgressRemaining <= 0) {
                checkLeft = this.chasePath(state, "left", distX, distY);
                checkRight = this.chasePath(state, "right", distX, distY);
                checkUp = this.chasePath(state, "up", distX, distY);
                checkDown = this.chasePath(state, "down", distX, distY);
            }

            if (checkLeft || checkRight || checkUp || checkDown) {
                const values = [checkLeft, checkRight, checkUp, checkDown];
                const value_names = ["left", "right", "up", "down"];
                const max = Math.max(checkLeft, checkRight, checkUp, checkDown);
                console.log(max);
                let chosenValues = [];

                values.forEach((value, index) => {
                    if (value === max) {
                        chosenValues.push(value_names[index]);
                    }
                })

                this.startBehavior(state, {
                    type: "walk",
                    direction: chosenValues[Math.floor(Math.random() * chosenValues.length)],
                    time: 0
                });
            }
        }

        if (this.movingProgressRemaining > 0) {
            this.updatePosition(state);
        }
        else {
            if (!this.isHidden && !state.map.isCutscenePlaying && this.isPlayerControlled && state.arrow) {
                this.startBehavior(state, {
                    type: "walk",
                    direction: state.arrow,
                    time: 0
                });
            }

            this.updateSprite(state);
        }
    }

    startBehavior(state, behaviour) {
        switch  (behaviour.type) {

            case "walk":
                if (behaviour.direction === "random") {
                    behaviour.direction = this.allDirections[Math.floor(Math.random() * this.allDirections.length)];
                }

                if (behaviour.direction !== "") {
                    this.direction = behaviour.direction;
                }

                switch (behaviour.time)
                {
                    case 0:
                        this.movingProgressRemaining = 16;
                        break;

                    case -1:
                        this.movingProgressRemaining = 16 * Math.floor(Math.random() * 10 + 1);
                        break;

                    default:
                        this.movingProgressRemaining = 16 * behaviour.time;
                        break;

                }
                break;


            case "stand":
                this.isStanding = true;
                let time = 0;
                switch (behaviour.time)
                {
                    case -1:
                        time = Math.floor(Math.random() * 3000);
                        break;

                    default:
                        time = behaviour.time;
                        break;

                }

                if (behaviour.direction === "random") {
                    behaviour.direction = this.allDirections[Math.floor(Math.random() * this.allDirections.length)];
                }

                if (behaviour.direction !== "") {
                    this.direction = behaviour.direction;
                }

                setTimeout(() => {
                    utils.emitEvent("PersonStandingComplete", {
                        whoId: this.id
                    });
                    this.isStanding = false;
                    this.updateSprite(state);
                }, time);
                break;


            case "hide":
                switch (this.isHidden)
                {
                    case true:
                        setTimeout(() => {
                            utils.emitEvent("PersonHidingComplete", {
                                whoId: this.id
                            });
                            this.isHidden = false;
                        }, 1000);
                        break;

                    case false:
                        setTimeout(() => {
                            utils.emitEvent("PersonHidingComplete", {
                                whoId: this.id
                            });
                            this.isHidden = true;
                        }, 1000);
                        break;

                }
                break;
        }
    }

    updatePosition(state) {
        if (this.movingProgressRemaining % 16 === 0 && this.movingProgressRemaining > 0) {
            if (!this.chase && state.map.isSpaceTaken(this.x, this.y, this.direction, 1)) {
                this.movingProgressRemaining = 0;
                utils.emitEvent("PersonWalkingComplete", {
                    whoId: this.id
                });
                return;
            }

            state.map.moveWall(this.x, this.y, this.direction, 1);
            this.footsteps.play();
            this.updateSprite(state);
        }

        const [property, change] = this.directionUpdate[this.direction];
        this[property] += change;
        this.movingProgressRemaining -= this.movementSpeed;

        if (this.movingProgressRemaining === 0) {
            utils.emitEvent("PersonWalkingComplete", {
                    whoId: this.id
                });
        }
    }

    updateSprite(state) {
        if (this.isSleeping) {
            if (this.sleepTimer === 0) {
                this.sprite.setAnimation("asleep");
            }
            return;
        }

        if (this.direction !== this.savedDirection && (this.direction === "left" || this.direction === "right")) {
            this.savedDirection = this.direction;
        }

        if (this.movingProgressRemaining > 0) {
            this.sprite.setAnimation("walk-" + this.savedDirection);
            return;
        }

        this.sprite.setAnimation("idle-" + this.savedDirection);
    }
}