class OverworldMap {
    constructor(config) {
        this.overworld = null;
        this.id = config.id || "DemoRoom";
        this.gameObjects = config.gameObjects || {};
        this.VNCharacters = config.VNCharacters || {};
        this.cutsceneSpaces = config.cutsceneSpaces || {};
        this.entryCutscene = config.entryCutscene || [];
        this.walls = config.walls || {};
        this.music = config.music || null;

        this.lowerImage = new Image();
        this.lowerImage.src = config.lowerSrc;
        this.lowerImage.onload = () => {
            this.isLoaded = true;
        };

        this.upperImage = new Image();
        this.upperImage.src = config.upperSrc;

        this.isCutscenePlaying = false;

        this.isMessageShowing = false;
        this.message = null;

        this.haveCutscene = true;
    }

    drawLowerImage(ctx, cameraPerson) {
        ctx.drawImage(this.lowerImage,
            utils.withGrid(9) - cameraPerson.x,
            utils.withGrid(6.5) - cameraPerson.y);
    }

    drawUpperImage(ctx, cameraPerson) {
        ctx.drawImage(this.upperImage,
            utils.withGrid(9) - cameraPerson.x,
            utils.withGrid(6.5) - cameraPerson.y);
    }

    isSpaceTaken(currentX, currentY, direction, multiplier) {
        const {x, y} = utils.nextPosition(currentX, currentY, direction, multiplier);
        return this.walls[`${x},${y}`] || false;
    }

    mountObjects() {
        if (this.music) {
            this.overworld.progress.musicSrc = this.music;
        }

        Object.keys(this.gameObjects).forEach(key => {
            let object = this.gameObjects[key];
            object.id = key;
            object.mount(this);
        });
    }

    async startCutscene(events) {
        this.isCutscenePlaying = true;
        if (this.message) {
            this.message.element.classList.add("hidden");
        }

        for (let i=0; i<events.length; i++) {
            const eventHandler = new OverworldEvent({
                event: events[i],
                map: this
            });
            await eventHandler.init();
        }

        this.isCutscenePlaying = false;
        if (this.message) {
            this.message.element.classList.remove("hidden");
        }

        Object.values(this.gameObjects).forEach(object => {
            if (object.returnAfterChase) {
                this.removeWall(object.x, object.y);
                object.x = object.startPosition.x;
                object.y = object.startPosition.y;
                this.addWall(object.x, object.y);
            }
            object.doBehaviourEvent(this);
        });
    }

    async startNonCutscene(events) {
        for (let i=0; i<events.length; i++) {
            const eventHandler = new OverworldEvent({
                event: events[i],
                map: this
            });
            await eventHandler.init();
        }
    }

    checkRadiusPresence(hero, object, multiplier) {
        const nextCoordsUP = utils.nextPosition(hero.x, hero.y, "up", multiplier);
        const nextCoordsDOWN = utils.nextPosition(hero.x, hero.y, "down", multiplier);
        const nextCoordsLEFT = utils.nextPosition(hero.x, hero.y, "left", multiplier);
        const nextCoordsRIGHT = utils.nextPosition(hero.x, hero.y, "right", multiplier);

        return [`${nextCoordsUP.x},${nextCoordsUP.y}`, `${nextCoordsDOWN.x},${nextCoordsDOWN.y}`,
                `${nextCoordsRIGHT.x},${nextCoordsRIGHT.y}`, `${nextCoordsLEFT.x},${nextCoordsLEFT.y}`,
                `${nextCoordsRIGHT.x},${nextCoordsDOWN.y}`, `${nextCoordsRIGHT.x},${nextCoordsUP.y}`,
                `${nextCoordsLEFT.x},${nextCoordsDOWN.y}`, `${nextCoordsLEFT.x},${nextCoordsUP.y}`,
                `${hero.x},${hero.y}`].includes(`${object.x},${object.y}`);
    }

    checkRadiusPresenceHero(hero, object, multiplier) {
        return Math.abs(hero.x - object.x) < 16 * multiplier && Math.abs(hero.y - object.y) < 16 * multiplier;
    }

    checkForActionCutscene() {
        const hero = this.gameObjects["hero"];

        const match = Object.values(this.gameObjects).find(object => {
            if (object.id === hero.id) {
                return false;
            }

            return this.checkRadiusPresence(hero, object, 1);
        });

       // console.log(match);
        if (!this.isCutscenePlaying && match && match.talking.length) {
            this.startCutscene(match.talking[0].events);
        }
    }

    checkForActionCutsceneInstructions() {
        const hero = this.gameObjects["hero"];

        const match = Object.values(this.gameObjects).find(object => {
            if (object.id === hero.id) {
                return false;
            }

            return this.checkRadiusPresence(hero, object, 1);
        });
        if (!this.isCutscenePlaying && !this.isMessageShowing && match && match.talking.length) {
            this.message = new ShowMessage;
            this.isMessageShowing = true;
            this.message.init( document.querySelector(".game-container") );
        }

        if (this.isMessageShowing && !match) {
            this.isMessageShowing = false;
            this.message.element.remove();
            this.message = null;
        }
    }

    checkForFootstepCutscene() {
        const hero = this.gameObjects["hero"];
        const match = this.cutsceneSpaces[`${hero.x},${hero.y}`];
        if (!this.isCutscenePlaying && match) {
            this.startCutscene(match[0].events);
        }
    }

    checkForEnemyClose(object) {
       // console.log("checking");
        const hero = this.gameObjects["hero"];
        let match;
        if (object.chase) {
            match = this.checkRadiusPresenceHero(object, hero, 8);
        }
        else {
            match = this.checkRadiusPresenceHero(object, hero, 4);
        }

       // console.log(this.isCutscenePlaying, match, hero.isHidden);

        if (!this.isCutscenePlaying && match && !hero.isHidden) {
            //console.log("found");
            if (!object.chase) {
                this.overworld.musicChangeSrc("Chase");
                object.isStanding = false;
            }
            object.chase = true;
        }
        else {
            //console.log("lost");
            if (object.chase) {
                this.overworld.musicChangeSrc("Calm");
                if (object.returnAfterChase) {
                    this.removeWall(object.x, object.y);
                    object.x = object.startPosition.x;
                    object.y = object.startPosition.y;
                    this.addWall(object.x, object.y);
                }
                object.doBehaviourEvent(this);
            }
            object.chase = false;
        }

    }

    enemyJumpscare() {
        //console.log("jumpscare!");

        if (!this.isCutscenePlaying) {
            if (this.isMessageShowing) {
                this.isMessageShowing = false;
                this.message.element.remove();
                this.message = null;
            }

            this.startCutscene([
                {type: "changeMap", map: this.overworld.progress.mapId}
            ]);
        }
    }

    addWall(x,y) {
        this.walls[`${x},${y}`] = true;
    }

    removeWall(x,y) {
        delete this.walls[`${x},${y}`];
    }

    moveWall(wasX, wasY, direction, multiplier) {
        this.removeWall(wasX, wasY);
        const {x,y} = utils.nextPosition(wasX, wasY, direction, multiplier);
        this.addWall(x,y);
    }
}

window.wallGeneration = function(array, xStart, yStart, width, height) {
    let array_new = array;
    for (i = xStart; i <= xStart + width; i++) {
        array[utils.asGridCoord(i, yStart)] = true;
        array[utils.asGridCoord(i, yStart + height)] = true;
    }
    for (i = yStart; i <= yStart + height; i++) {
        array[utils.asGridCoord(xStart, i)] = true;
        array[utils.asGridCoord(xStart + width, i)] = true;
    }


    return array_new;
}

window.OverworldMaps = function (name, index) {
    switch (name) {
       /* case "DemoRoom":
            switch (index) {
                case 0:
                    return {
                        id: "DemoRoom",
                        lowerSrc: "assets/images/backgrounds/mc_second_floor.png",
                        upperSrc: "",
                        music: "VNStartMC",
                        gameObjects: {
                            key: new Items({
                                x: utils.withGrid(10),
                                y: utils.withGrid(4),
                                src: "assets/images/items/key.png",
                                talking: [{
                                    events: [
                                        {type: "itemPicked", who: "key"}
                                    ]
                                }]
                            }),
                            hero: new Person({
                                isPlayerControlled: true,
                                x: utils.withGrid(8),
                                y: utils.withGrid(4),
                            }),
                            npc1: new Person({
                                x: utils.withGrid(10),
                                y: utils.withGrid(2),
                                src: "/assets/images/characters/gf_dad.png",
                                talking: [{
                                    events: [
                                        {type: "removeObject", object: "key", who: "npc1", text: "Need a key"}
                                    ]
                                }]
                            })
                        },
                        walls: {
                            [utils.asGridCoord(0, 3)]: true,
                            [utils.asGridCoord(0, 4)]: true
                        },
                        cutsceneSpaces: {
                            [utils.asGridCoord(2, 5)]: [{
                                events: [
                                    {type: "changeMap", map: "DemoRoom1"}
                                ]
                            }]
                        }
                    };

                case 1:
                    return {
                        id: "DemoRoom",
                        lowerSrc: "/assets/images/backgrounds/mc_second_floor.png",
                        upperSrc: "",
                        gameObjects: {
                            hero: new Person({
                                isPlayerControlled: true,
                                x: utils.withGrid(8),
                                y: utils.withGrid(4),
                            })
                        },
                        walls: {
                            [utils.asGridCoord(0, 3)]: true,
                            [utils.asGridCoord(0, 4)]: true
                        },
                        cutsceneSpaces: {
                            [utils.asGridCoord(2, 5)]: [{
                                events: [
                                    {type: "changeMap", map: "DemoRoom1"}
                                ]
                            }]
                        }
                    };
            }
            break;

        case "DemoRoom1":
            switch (index) {
                case 0:
                    return {id: "DemoRoom1",
                            lowerSrc: "/assets/images/backgrounds/mc_first_floor.png",
                            upperSrc: "",
                            gameObjects: {
                                    hero: new Person({
                                        isPlayerControlled: true,
                                        x: utils.withGrid(8),
                                        y: utils.withGrid(4)
                                    }),
                                    hidingSpot: new Person({
                                        x: utils.withGrid(8),
                                        y: utils.withGrid(6),
                                        src: "/assets/images/characters/invisible_guy.png",
                                        talking: [{
                                            events: [
                                                {who: "hero", type: "hidingToggle"}
                                            ]
                                        }]
                                    }),
                                    npc1: new Person({
                                        x: utils.withGrid(10),
                                        y: utils.withGrid(2),
                                        src: "/assets/images/characters/gf_dad.png",
                                        behaviorLoop: [
                                            // {type: "walk", direction: "random", time: -1},
                                            {type: "stand", direction: "", time: -1}
                                        ],
                                        talking: [{
                                            events: [
                                                {type: "textMessage", text: "STFU"}
                                            ]
                                        }]
                                    })
                                },
                            walls: {
                                    [utils.asGridCoord(0, 3)]: true,
                                    [utils.asGridCoord(0, 4)]: true
                            },
                            cutsceneSpaces: {
                                    [utils.asGridCoord(2, 5)]: [{
                                        events: [
                                            {who: "hero", type: "walk", direction: "up", time: 0},
                                            {who: "hero", type: "walk", direction: "down", time: 0}
                                        ]
                                    }]
                            }};

                }
                break;*/

        case "VNPartMCHouse":
            switch (index) {
                case 0:
                    return {
                        id: "VNPartMCHouse",
                        lowerSrc: "assets/images/backgrounds/mc_bedroom.png",
                        upperSrc: "",
                        music: "VNStartMC",
                        gameObjects: {
                            hero: new Person({
                                isPlayerControlled: true,
                                isHidden: true,
                                x: utils.withGrid(10),
                                y: utils.withGrid(7.5)
                            })
                        },
                        entryCutscene: [
                            {type: "textMessage", text: "Night 1."},
                            {type: "textMessage", text: "It's night already."},
                            {type: "textMessage", text: "How wonderful!"},
                            {type: "textMessage", text: "I get to see my girlfriend again."},
                            {type: "textMessage", text: "My parents are away for a week."},
                            {type: "textMessage", text: "There should be no trouble getting out."},
                            {type: "textMessage", text: "Her parents though..."},
                            {type: "textMessage", text: "They are strict."},
                            {type: "textMessage", text: "Maybe I'll manage to sneak past them."},
                            {type: "changeMap", map: "MCSecondFloor"}
                        ]
                    };

                case 1:
                    return {
                        id: "VNPartMCHouse",
                        lowerSrc: "assets/images/backgrounds/mc_bedroom.png",
                        upperSrc: "",
                        music: "VNStartMC",
                        gameObjects: {
                            hero: new Person({
                                isPlayerControlled: true,
                                isHidden: true,
                                x: utils.withGrid(10),
                                y: utils.withGrid(7.5)
                            })
                        },
                        entryCutscene: [
                            {type: "textMessage", text: "Night 2."},
                            {type: "textMessage", text: "Another day, another night with my girlfriend! :3"},
                            {type: "textMessage", text: "Last time, it was so easy to get there!"},
                            {type: "textMessage", text: "Hopefully, I'll get by again."},
                            {type: "changeMap", map: "MCSecondFloor"}
                        ]
                    };

                case 2:
                    return {
                        id: "VNPartMCHouse",
                        lowerSrc: "assets/images/backgrounds/mc_bedroom.png",
                        upperSrc: "",
                        music: "VNStartMC",
                        gameObjects: {
                            hero: new Person({
                                isPlayerControlled: true,
                                isHidden: true,
                                x: utils.withGrid(10),
                                y: utils.withGrid(7.5)
                            })
                        },
                        entryCutscene: [
                            {type: "textMessage", text: "Night 3."},
                            {type: "textMessage", text: "My parents came back unexpectedly.."},
                            {type: "textMessage", text: "Still, should not be a problem."},
                            {type: "textMessage", text: "They support my relationship!"},
                            {type: "changeMap", map: "MCSecondFloor"}
                        ]
                    };

                case 3:
                    return {
                        id: "VNPartMCHouse",
                        lowerSrc: "assets/images/backgrounds/mc_bedroom.png",
                        upperSrc: "",
                        music: "VNStartMC",
                        gameObjects: {
                            hero: new Person({
                                isPlayerControlled: true,
                                isHidden: true,
                                x: utils.withGrid(10),
                                y: utils.withGrid(7.5)
                            })
                        },
                        entryCutscene: [
                            {type: "textMessage", text: "Night 4."},
                            {type: "textMessage", text: "Her parents told mine that I should not come over again."},
                            {type: "textMessage", text: "I still want to see her though."},
                            {type: "changeMap", map: "MCSecondFloor"}
                        ]
                    };

                case 4:
                    return {
                        id: "VNPartMCHouse",
                        lowerSrc: "assets/images/backgrounds/mc_bedroom.png",
                        upperSrc: "assets/images/backgrounds/darkest.png",
                        music: "VNEnd",
                        gameObjects: {
                            hero: new Person({
                                isPlayerControlled: true,
                                isHidden: true,
                                x: utils.withGrid(10),
                                y: utils.withGrid(7.5)
                            })
                        },
                        entryCutscene: [
                            {type: "textMessage", text: "Night 5."},
                            {type: "textMessage", text: "I have to see her."},
                            {type: "changeMap", map: "MCSecondFloor"}
                        ]
                    };


        }
        break;


        case "MCSecondFloor":
            switch (index) {
                case 0:
                    return {
                        id: "MCSecondFloor",
                        lowerSrc: "assets/images/backgrounds/mc_second_floor.png",
                        upperSrc: "",
                        music: "Calm",
                        gameObjects: {
                            hero: new Person({
                                isPlayerControlled: true,
                                x: utils.withGrid(3),
                                y: utils.withGrid(6),
                            })
                        },
                        walls: window.wallGeneration(
                            window.wallGeneration(
                                window.wallGeneration({},
                                    -1, 3, 21, 12),
                                12, 7, 7, 7),
                        0, 7, 8, 7),
                        cutsceneSpaces: {
                            [utils.asGridCoord(9,  14)]: [{
                                events: [
                                    {type: "changeMap", map: "MCFirstFloor"}
                                ]
                            }],
                            [utils.asGridCoord(10,  14)]: [{
                                events: [
                                    {type: "changeMap", map: "MCFirstFloor"}
                                ]
                            }],
                            [utils.asGridCoord(11,  14)]: [{
                                events: [
                                    {type: "changeMap", map: "MCFirstFloor"}
                                ]
                            }]
                        }
                    };

                case 1:
                    return {
                        id: "MCSecondFloor",
                        lowerSrc: "assets/images/backgrounds/mc_second_floor.png",
                        upperSrc: "",
                        music: "Calm",
                        gameObjects: {
                            hero: new Person({
                                isPlayerControlled: true,
                                x: utils.withGrid(3),
                                y: utils.withGrid(6),
                            })
                        },
                        walls: window.wallGeneration(
                            window.wallGeneration(
                                window.wallGeneration({},
                                    -1, 3, 21, 12),
                                12, 7, 7, 7),
                            0, 7, 8, 7),
                        cutsceneSpaces: {
                            [utils.asGridCoord(9,  14)]: [{
                                events: [
                                    {type: "changeMap", map: "MCFirstFloor"}
                                ]
                            }],
                            [utils.asGridCoord(10,  14)]: [{
                                events: [
                                    {type: "changeMap", map: "MCFirstFloor"}
                                ]
                            }],
                            [utils.asGridCoord(11,  14)]: [{
                                events: [
                                    {type: "changeMap", map: "MCFirstFloor"}
                                ]
                            }]
                        }
                    };

                case 2:
                    return {
                        id: "MCSecondFloor",
                        lowerSrc: "assets/images/backgrounds/mc_second_floor.png",
                        upperSrc: "",
                        music: "Calm",
                        gameObjects: {
                            hero: new Person({
                                isPlayerControlled: true,
                                x: utils.withGrid(3),
                                y: utils.withGrid(6),
                            })
                        },
                        walls: window.wallGeneration(
                            window.wallGeneration(
                                window.wallGeneration({},
                                    -1, 3, 21, 12),
                                12, 7, 7, 7),
                            0, 7, 8, 7),
                        cutsceneSpaces: {
                            [utils.asGridCoord(9,  14)]: [{
                                events: [
                                    {type: "changeMap", map: "MCFirstFloor"}
                                ]
                            }],
                            [utils.asGridCoord(10,  14)]: [{
                                events: [
                                    {type: "changeMap", map: "MCFirstFloor"}
                                ]
                            }],
                            [utils.asGridCoord(11,  14)]: [{
                                events: [
                                    {type: "changeMap", map: "MCFirstFloor"}
                                ]
                            }]
                        }
                    };

                case 3:
                    return {
                        id: "MCSecondFloor",
                        lowerSrc: "assets/images/backgrounds/mc_second_floor.png",
                        upperSrc: "",
                        music: "Calm",
                        gameObjects: {
                            hero: new Person({
                                isPlayerControlled: true,
                                x: utils.withGrid(3),
                                y: utils.withGrid(6),
                            })
                        },
                        walls: window.wallGeneration(
                            window.wallGeneration(
                                window.wallGeneration({},
                                    -1, 3, 21, 12),
                                12, 7, 7, 7),
                            0, 7, 8, 7),
                        cutsceneSpaces: {
                            [utils.asGridCoord(9,  14)]: [{
                                events: [
                                    {type: "changeMap", map: "MCFirstFloor"}
                                ]
                            }],
                            [utils.asGridCoord(10,  14)]: [{
                                events: [
                                    {type: "changeMap", map: "MCFirstFloor"}
                                ]
                            }],
                            [utils.asGridCoord(11,  14)]: [{
                                events: [
                                    {type: "changeMap", map: "MCFirstFloor"}
                                ]
                            }]
                        }
                    };

                case 4:
                    return {
                        id: "MCSecondFloor",
                        lowerSrc: "assets/images/backgrounds/mc_second_floor.png",
                        upperSrc: "assets/images/backgrounds/darkest.png",
                        music: "Calm",
                        gameObjects: {
                            hero: new Person({
                                isPlayerControlled: true,
                                x: utils.withGrid(3),
                                y: utils.withGrid(6),
                            })
                        },
                        walls: window.wallGeneration(
                            window.wallGeneration(
                                window.wallGeneration({},
                                    -1, 3, 21, 12),
                                12, 7, 7, 7),
                            0, 7, 8, 7),
                        cutsceneSpaces: {
                            [utils.asGridCoord(9,  14)]: [{
                                events: [
                                    {type: "changeMap", map: "MCFirstFloor"}
                                ]
                            }],
                            [utils.asGridCoord(10,  14)]: [{
                                events: [
                                    {type: "changeMap", map: "MCFirstFloor"}
                                ]
                            }],
                            [utils.asGridCoord(11,  14)]: [{
                                events: [
                                    {type: "changeMap", map: "MCFirstFloor"}
                                ]
                            }]
                        }
                    };
            }
            break;


        case "MCFirstFloor":
            switch (index) {
                case 0:
                    return {
                        id: "MCFirstFloor",
                        lowerSrc: "assets/images/backgrounds/mc_first_floor.png",
                        upperSrc: "",
                        music: "Calm",
                        gameObjects: {
                            hero: new Person({
                                isPlayerControlled: true,
                                x: utils.withGrid(13.5),
                                y: utils.withGrid(4.5),
                            }),
                            tv: new GameObject({
                                src: "assets/images/objects/tv_color.png",
                                x: utils.withGrid(0.5),
                                y: utils.withGrid(1.5),
                                width: 46,
                                height: 47
                            }),
                            chair: new GameObject({
                                src: "assets/images/objects/chair_color.png",
                                x: utils.withGrid(4.5),
                                y: utils.withGrid(2.5),
                                width: 40,
                                height: 39
                            }),
                            sofa: new GameObject({
                                src: "assets/images/objects/sofa_color.png",
                                x: utils.withGrid(1.5),
                                y: utils.withGrid(5.5),
                                width: 64,
                                height: 27
                            }),
                            cupboard: new GameObject({
                                src: "assets/images/objects/cupboard_color.png",
                                x: utils.withGrid(9.5),
                                y: utils.withGrid(2.5),
                                width: 29,
                                height: 77,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            table: new GameObject({
                                src: "assets/images/objects/table_color.png",
                                x: utils.withGrid(3.5),
                                y: utils.withGrid(11.5),
                                width: 82,
                                height: 61,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            chairtop: new GameObject({
                                src: "assets/images/objects/chairtop_color.png",
                                x: utils.withGrid(5.5),
                                y: utils.withGrid(10.5),
                                width: 14,
                                height: 18,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            chairbottom: new GameObject({
                                src: "assets/images/objects/chairbottom_color.png",
                                x: utils.withGrid(5.5),
                                y: utils.withGrid(15.5),
                                width: 15,
                                height: 28,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            chairleft: new GameObject({
                                src: "assets/images/objects/chairleft_color.png",
                                x: utils.withGrid(8.5),
                                y: utils.withGrid(12.5),
                                width: 22,
                                height: 35,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            chairright: new GameObject({
                                src: "assets/images/objects/chairright_color.png",
                                x: utils.withGrid(1.5),
                                y: utils.withGrid(12.5),
                                width: 18,
                                height: 35,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            kitchen: new GameObject({
                                src: "assets/images/objects/kitchen_color.png",
                                x: utils.withGrid(16.5),
                                y: utils.withGrid(1.5),
                                width: 146,
                                height: 127,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            plant: new GameObject({
                                src: "assets/images/objects/plant_color.png",
                                x: utils.withGrid(16.5),
                                y: utils.withGrid(9.5),
                                width: 23,
                                height: 29
                            }),
                            sink: new GameObject({
                                src: "assets/images/objects/sink_color.png",
                                x: utils.withGrid(18.5),
                                y: utils.withGrid(12.5),
                                width: 50,
                                height: 21,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            toilet: new GameObject({
                                src: "assets/images/objects/toilet_color.png",
                                x: utils.withGrid(16.5),
                                y: utils.withGrid(15.5),
                                width: 20,
                                height: 25
                            }),
                            bathtub: new GameObject({
                                src: "assets/images/objects/bathtub_color.png",
                                x: utils.withGrid(23.5),
                                y: utils.withGrid(12.5),
                                width: 25,
                                height: 62
                            })
                        },
                        walls: window.wallGeneration(
                            window.wallGeneration(
                            window.wallGeneration(
                            window.wallGeneration(
                                window.wallGeneration(
                                    window.wallGeneration(
                                        window.wallGeneration(
                                            window.wallGeneration(
                                                window.wallGeneration(
                                                window.wallGeneration(
                                                    window.wallGeneration(
                                                        window.wallGeneration({},
                                                        0.5, 0.5, 23, 17),
                                                    9.5, 0.5, 1, 6),
                                                10.5, 9.5, 0, 8),
                                            14.5, 0.5, 1, 4),
                                            14.5, 7.5, 1, 3),
                                        14.5, 14.5, 1, 3),
                                    15.5, 10.5, 7, 0),
                                15.5, 15.5, 7, 0),
                        15.5, 1.5, 7, 0),
                        1.5, 1.5, 9, 0),
                        9.5, 2.5, 0, 2),
                            3.5, 11.5, 4, 1),
                        cutsceneSpaces: {
                            [utils.asGridCoord(11.5, 16.5)]: [{
                                events: [
                                    {type: "changeMap", map: "Outside"}
                                ]
                            }],
                            [utils.asGridCoord(12.5, 16.5)]: [{
                                events: [
                                    {type: "changeMap", map: "Outside"}
                                ]
                            }],
                            [utils.asGridCoord(13.5, 16.5)]: [{
                                events: [
                                    {type: "changeMap", map: "Outside"}
                                ]
                            }]
                        }
                    };

                case 1:
                    return {
                        id: "MCFirstFloor",
                        lowerSrc: "assets/images/backgrounds/mc_first_floor.png",
                        upperSrc: "",
                        music: "Calm",
                        gameObjects: {
                            hero: new Person({
                                isPlayerControlled: true,
                                x: utils.withGrid(13.5),
                                y: utils.withGrid(4.5),
                            }),
                            tv: new GameObject({
                                src: "assets/images/objects/tv_color.png",
                                x: utils.withGrid(0.5),
                                y: utils.withGrid(1.5),
                                width: 46,
                                height: 47
                            }),
                            chair: new GameObject({
                                src: "assets/images/objects/chair_color.png",
                                x: utils.withGrid(4.5),
                                y: utils.withGrid(2.5),
                                width: 40,
                                height: 39
                            }),
                            sofa: new GameObject({
                                src: "assets/images/objects/sofa_color.png",
                                x: utils.withGrid(1.5),
                                y: utils.withGrid(5.5),
                                width: 64,
                                height: 27
                            }),
                            cupboard: new GameObject({
                                src: "assets/images/objects/cupboard_color.png",
                                x: utils.withGrid(9.5),
                                y: utils.withGrid(2.5),
                                width: 29,
                                height: 77,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            table: new GameObject({
                                src: "assets/images/objects/table_color.png",
                                x: utils.withGrid(3.5),
                                y: utils.withGrid(11.5),
                                width: 82,
                                height: 61,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            chairtop: new GameObject({
                                src: "assets/images/objects/chairtop_color.png",
                                x: utils.withGrid(5.5),
                                y: utils.withGrid(10.5),
                                width: 14,
                                height: 18,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            chairbottom: new GameObject({
                                src: "assets/images/objects/chairbottom_color.png",
                                x: utils.withGrid(5.5),
                                y: utils.withGrid(15.5),
                                width: 15,
                                height: 28,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            chairleft: new GameObject({
                                src: "assets/images/objects/chairleft_color.png",
                                x: utils.withGrid(8.5),
                                y: utils.withGrid(12.5),
                                width: 22,
                                height: 35,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            chairright: new GameObject({
                                src: "assets/images/objects/chairright_color.png",
                                x: utils.withGrid(1.5),
                                y: utils.withGrid(12.5),
                                width: 18,
                                height: 35,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            kitchen: new GameObject({
                                src: "assets/images/objects/kitchen_color.png",
                                x: utils.withGrid(16.5),
                                y: utils.withGrid(1.5),
                                width: 146,
                                height: 127,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            plant: new GameObject({
                                src: "assets/images/objects/plant_color.png",
                                x: utils.withGrid(16.5),
                                y: utils.withGrid(9.5),
                                width: 23,
                                height: 29
                            }),
                            sink: new GameObject({
                                src: "assets/images/objects/sink_color.png",
                                x: utils.withGrid(18.5),
                                y: utils.withGrid(12.5),
                                width: 50,
                                height: 21,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            toilet: new GameObject({
                                src: "assets/images/objects/toilet_color.png",
                                x: utils.withGrid(16.5),
                                y: utils.withGrid(15.5),
                                width: 20,
                                height: 25
                            }),
                            bathtub: new GameObject({
                                src: "assets/images/objects/bathtub_color.png",
                                x: utils.withGrid(23.5),
                                y: utils.withGrid(12.5),
                                width: 25,
                                height: 62
                            })
                        },
                        walls: window.wallGeneration(
                            window.wallGeneration(
                            window.wallGeneration(
                            window.wallGeneration(
                                window.wallGeneration(
                                    window.wallGeneration(
                                        window.wallGeneration(
                                            window.wallGeneration(
                                                window.wallGeneration(
                                                    window.wallGeneration(
                                                        window.wallGeneration(
                                                            window.wallGeneration({},
                                                                0.5, 0.5, 23, 17),
                                                            9.5, 0.5, 1, 6),
                                                        10.5, 9.5, 0, 8),
                                                    14.5, 0.5, 1, 4),
                                                14.5, 7.5, 1, 3),
                                            14.5, 14.5, 1, 3),
                                        15.5, 10.5, 7, 0),
                                    15.5, 15.5, 7, 0),
                                15.5, 1.5, 7, 0),
                            1.5, 1.5, 9, 0),
                                9.5, 2.5, 0, 2),
                            3.5, 11.5, 4, 1),
                        cutsceneSpaces: {
                            [utils.asGridCoord(11.5, 16.5)]: [{
                                events: [
                                    {type: "changeMap", map: "Outside"}
                                ]
                            }],
                            [utils.asGridCoord(12.5, 16.5)]: [{
                                events: [
                                    {type: "changeMap", map: "Outside"}
                                ]
                            }],
                            [utils.asGridCoord(13.5, 16.5)]: [{
                                events: [
                                    {type: "changeMap", map: "Outside"}
                                ]
                            }]
                        }
                    };

                case 2:
                    return {
                        id: "MCFirstFloor",
                        lowerSrc: "assets/images/backgrounds/mc_first_floor.png",
                        upperSrc: "",
                        music: "Calm",
                        gameObjects: {
                            hero: new Person({
                                isPlayerControlled: true,
                                x: utils.withGrid(13.5),
                                y: utils.withGrid(4.5),
                            }),
                            npc1: new Person({
                                x: utils.withGrid(6.5),
                                y: utils.withGrid(7.5),
                                src: "assets/images/characters/mc_dad.png",
                                behaviorLoop: [
                                    {type: "stand", direction: "", time: -1}
                                ],
                                talking: [{
                                    events: [
                                        {type: "textMessage", text: "Are you meeting with your..friend? *wink-wink*"}
                                    ]
                                }]
                            }),
                            npc2: new Person({
                                x: utils.withGrid(2.5),
                                y: utils.withGrid(7.5),
                                src: "assets/images/characters/mc_mom.png",
                                behaviorLoop: [
                                    {type: "stand", direction: "", time: -1}
                                ],
                                talking: [{
                                    events: [
                                        {type: "textMessage", text: "Don't be late, please, I'll be worried!"}
                                    ]
                                }]
                            }),
                            tv: new GameObject({
                                src: "assets/images/objects/tv_color.png",
                                x: utils.withGrid(0.5),
                                y: utils.withGrid(1.5),
                                width: 46,
                                height: 47
                            }),
                            chair: new GameObject({
                                src: "assets/images/objects/chair_color.png",
                                x: utils.withGrid(4.5),
                                y: utils.withGrid(2.5),
                                width: 40,
                                height: 39
                            }),
                            sofa: new GameObject({
                                src: "assets/images/objects/sofa_color.png",
                                x: utils.withGrid(1.5),
                                y: utils.withGrid(5.5),
                                width: 64,
                                height: 27
                            }),
                            cupboard: new GameObject({
                                src: "assets/images/objects/cupboard_color.png",
                                x: utils.withGrid(9.5),
                                y: utils.withGrid(2.5),
                                width: 29,
                                height: 77,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            table: new GameObject({
                                src: "assets/images/objects/table_color.png",
                                x: utils.withGrid(3.5),
                                y: utils.withGrid(11.5),
                                width: 82,
                                height: 61,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            chairtop: new GameObject({
                                src: "assets/images/objects/chairtop_color.png",
                                x: utils.withGrid(5.5),
                                y: utils.withGrid(10.5),
                                width: 14,
                                height: 18,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            chairbottom: new GameObject({
                                src: "assets/images/objects/chairbottom_color.png",
                                x: utils.withGrid(5.5),
                                y: utils.withGrid(15.5),
                                width: 15,
                                height: 28,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            chairleft: new GameObject({
                                src: "assets/images/objects/chairleft_color.png",
                                x: utils.withGrid(8.5),
                                y: utils.withGrid(12.5),
                                width: 22,
                                height: 35,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            chairright: new GameObject({
                                src: "assets/images/objects/chairright_color.png",
                                x: utils.withGrid(1.5),
                                y: utils.withGrid(12.5),
                                width: 18,
                                height: 35,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            kitchen: new GameObject({
                                src: "assets/images/objects/kitchen_color.png",
                                x: utils.withGrid(16.5),
                                y: utils.withGrid(1.5),
                                width: 146,
                                height: 127,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            plant: new GameObject({
                                src: "assets/images/objects/plant_color.png",
                                x: utils.withGrid(16.5),
                                y: utils.withGrid(9.5),
                                width: 23,
                                height: 29
                            }),
                            sink: new GameObject({
                                src: "assets/images/objects/sink_color.png",
                                x: utils.withGrid(18.5),
                                y: utils.withGrid(12.5),
                                width: 50,
                                height: 21,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            toilet: new GameObject({
                                src: "assets/images/objects/toilet_color.png",
                                x: utils.withGrid(16.5),
                                y: utils.withGrid(15.5),
                                width: 20,
                                height: 25
                            }),
                            bathtub: new GameObject({
                                src: "assets/images/objects/bathtub_color.png",
                                x: utils.withGrid(23.5),
                                y: utils.withGrid(12.5),
                                width: 25,
                                height: 62
                            })
                        },
                        walls: window.wallGeneration(
                            window.wallGeneration(
                            window.wallGeneration(
                            window.wallGeneration(
                                window.wallGeneration(
                                    window.wallGeneration(
                                        window.wallGeneration(
                                            window.wallGeneration(
                                                window.wallGeneration(
                                                    window.wallGeneration(
                                                        window.wallGeneration(
                                                            window.wallGeneration({},
                                                                0.5, 0.5, 23, 17),
                                                            9.5, 0.5, 1, 6),
                                                        10.5, 9.5, 0, 8),
                                                    14.5, 0.5, 1, 4),
                                                14.5, 7.5, 1, 3),
                                            14.5, 14.5, 1, 3),
                                        15.5, 10.5, 7, 0),
                                    15.5, 15.5, 7, 0),
                                15.5, 1.5, 7, 0),
                            1.5, 1.5, 9, 0),
                                9.5, 2.5, 0, 2),
                            3.5, 11.5, 4, 1),
                        cutsceneSpaces: {
                            [utils.asGridCoord(11.5, 16.5)]: [{
                                events: [
                                    {type: "changeMap", map: "Outside"}
                                ]
                            }],
                            [utils.asGridCoord(12.5, 16.5)]: [{
                                events: [
                                    {type: "changeMap", map: "Outside"}
                                ]
                            }],
                            [utils.asGridCoord(13.5, 16.5)]: [{
                                events: [
                                    {type: "changeMap", map: "Outside"}
                                ]
                            }]
                        }
                    };

                case 3:
                    return {
                        id: "MCFirstFloor",
                        lowerSrc: "assets/images/backgrounds/mc_first_floor.png",
                        upperSrc: "",
                        music: "Calm",
                        gameObjects: {
                            hero: new Person({
                                isPlayerControlled: true,
                                x: utils.withGrid(13.5),
                                y: utils.withGrid(4.5),
                            }),
                            npc1: new Person({
                                isEnemy: true,
                                x: utils.withGrid(20.5),
                                y: utils.withGrid(6.5),
                                src: "assets/images/characters/mc_dad.png",
                                behaviorLoop: [
                                    {type: "walk", direction: "random", time: -1}
                                ]
                            }),
                            npc2: new Person({
                                x: utils.withGrid(2.5),
                                y: utils.withGrid(7.5),
                                src: "assets/images/characters/mc_mom.png",
                                behaviorLoop: [
                                    {type: "walk", direction: "random", time: -1}
                                ]
                            }),
                            tv: new GameObject({
                                src: "assets/images/objects/tv_color.png",
                                x: utils.withGrid(0.5),
                                y: utils.withGrid(1.5),
                                width: 46,
                                height: 47
                            }),
                            chair: new GameObject({
                                src: "assets/images/objects/chair_color.png",
                                x: utils.withGrid(4.5),
                                y: utils.withGrid(2.5),
                                width: 40,
                                height: 39
                            }),
                            sofa: new GameObject({
                                src: "assets/images/objects/sofa_color.png",
                                x: utils.withGrid(1.5),
                                y: utils.withGrid(5.5),
                                width: 64,
                                height: 27
                            }),
                            cupboard: new GameObject({
                                src: "assets/images/objects/cupboard_color.png",
                                x: utils.withGrid(9.5),
                                y: utils.withGrid(2.5),
                                width: 29,
                                height: 77,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            table: new GameObject({
                                src: "assets/images/objects/table_color.png",
                                x: utils.withGrid(3.5),
                                y: utils.withGrid(11.5),
                                width: 82,
                                height: 61,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            chairtop: new GameObject({
                                src: "assets/images/objects/chairtop_color.png",
                                x: utils.withGrid(5.5),
                                y: utils.withGrid(10.5),
                                width: 14,
                                height: 18,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            chairbottom: new GameObject({
                                src: "assets/images/objects/chairbottom_color.png",
                                x: utils.withGrid(5.5),
                                y: utils.withGrid(15.5),
                                width: 15,
                                height: 28,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            chairleft: new GameObject({
                                src: "assets/images/objects/chairleft_color.png",
                                x: utils.withGrid(8.5),
                                y: utils.withGrid(12.5),
                                width: 22,
                                height: 35,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            chairright: new GameObject({
                                src: "assets/images/objects/chairright_color.png",
                                x: utils.withGrid(1.5),
                                y: utils.withGrid(12.5),
                                width: 18,
                                height: 35,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            kitchen: new GameObject({
                                src: "assets/images/objects/kitchen_color.png",
                                x: utils.withGrid(16.5),
                                y: utils.withGrid(1.5),
                                width: 146,
                                height: 127,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            plant: new GameObject({
                                src: "assets/images/objects/plant_color.png",
                                x: utils.withGrid(16.5),
                                y: utils.withGrid(9.5),
                                width: 23,
                                height: 29
                            }),
                            sink: new GameObject({
                                src: "assets/images/objects/sink_color.png",
                                x: utils.withGrid(18.5),
                                y: utils.withGrid(12.5),
                                width: 50,
                                height: 21,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            toilet: new GameObject({
                                src: "assets/images/objects/toilet_color.png",
                                x: utils.withGrid(16.5),
                                y: utils.withGrid(15.5),
                                width: 20,
                                height: 25
                            }),
                            bathtub: new GameObject({
                                src: "assets/images/objects/bathtub_color.png",
                                x: utils.withGrid(23.5),
                                y: utils.withGrid(12.5),
                                width: 25,
                                height: 62
                            })
                        },
                        walls: window.wallGeneration(
                            window.wallGeneration(
                                window.wallGeneration(
                                    window.wallGeneration(
                                        window.wallGeneration(
                                            window.wallGeneration(
                                                window.wallGeneration(
                                                    window.wallGeneration(
                                                        window.wallGeneration(
                                                            window.wallGeneration(
                                                                window.wallGeneration(
                                                                    window.wallGeneration({},
                                                                        0.5, 0.5, 23, 17),
                                                                    9.5, 0.5, 1, 6),
                                                                10.5, 9.5, 0, 8),
                                                            14.5, 0.5, 1, 4),
                                                        14.5, 7.5, 1, 3),
                                                    14.5, 14.5, 1, 3),
                                                15.5, 10.5, 7, 0),
                                            15.5, 15.5, 7, 0),
                                        15.5, 1.5, 7, 0),
                                    1.5, 1.5, 9, 0),
                                9.5, 2.5, 0, 2),
                            3.5, 11.5, 4, 1),
                        cutsceneSpaces: {
                            [utils.asGridCoord(11.5, 16.5)]: [{
                                events: [
                                    {type: "changeMap", map: "Outside"}
                                ]
                            }],
                            [utils.asGridCoord(12.5, 16.5)]: [{
                                events: [
                                    {type: "changeMap", map: "Outside"}
                                ]
                            }],
                            [utils.asGridCoord(13.5, 16.5)]: [{
                                events: [
                                    {type: "changeMap", map: "Outside"}
                                ]
                            }]
                        }
                    };

                case 4:
                    return {
                        id: "MCFirstFloor",
                        lowerSrc: "assets/images/backgrounds/mc_first_floor.png",
                        upperSrc: "assets/images/backgrounds/darkest.png",
                        music: "Calm",
                        gameObjects: {
                            hero: new Person({
                                isPlayerControlled: true,
                                x: utils.withGrid(13.5),
                                y: utils.withGrid(4.5),
                            }),
                            tv: new GameObject({
                                src: "assets/images/objects/tv_color.png",
                                x: utils.withGrid(0.5),
                                y: utils.withGrid(1.5),
                                width: 46,
                                height: 47
                            }),
                            chair: new GameObject({
                                src: "assets/images/objects/chair_color.png",
                                x: utils.withGrid(4.5),
                                y: utils.withGrid(2.5),
                                width: 40,
                                height: 39
                            }),
                            sofa: new GameObject({
                                src: "assets/images/objects/sofa_color.png",
                                x: utils.withGrid(1.5),
                                y: utils.withGrid(5.5),
                                width: 64,
                                height: 27
                            }),
                            cupboard: new GameObject({
                                src: "assets/images/objects/cupboard_color.png",
                                x: utils.withGrid(9.5),
                                y: utils.withGrid(2.5),
                                width: 29,
                                height: 77,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            table: new GameObject({
                                src: "assets/images/objects/table_color.png",
                                x: utils.withGrid(3.5),
                                y: utils.withGrid(11.5),
                                width: 82,
                                height: 61,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            chairtop: new GameObject({
                                src: "assets/images/objects/chairtop_color.png",
                                x: utils.withGrid(5.5),
                                y: utils.withGrid(10.5),
                                width: 14,
                                height: 18,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            chairbottom: new GameObject({
                                src: "assets/images/objects/chairbottom_color.png",
                                x: utils.withGrid(5.5),
                                y: utils.withGrid(15.5),
                                width: 15,
                                height: 28,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            chairleft: new GameObject({
                                src: "assets/images/objects/chairleft_color.png",
                                x: utils.withGrid(8.5),
                                y: utils.withGrid(12.5),
                                width: 22,
                                height: 35,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            chairright: new GameObject({
                                src: "assets/images/objects/chairright_color.png",
                                x: utils.withGrid(1.5),
                                y: utils.withGrid(12.5),
                                width: 18,
                                height: 35,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            kitchen: new GameObject({
                                src: "assets/images/objects/kitchen_color.png",
                                x: utils.withGrid(16.5),
                                y: utils.withGrid(1.5),
                                width: 146,
                                height: 127,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            plant: new GameObject({
                                src: "assets/images/objects/plant_color.png",
                                x: utils.withGrid(16.5),
                                y: utils.withGrid(9.5),
                                width: 23,
                                height: 29
                            }),
                            sink: new GameObject({
                                src: "assets/images/objects/sink_color.png",
                                x: utils.withGrid(18.5),
                                y: utils.withGrid(12.5),
                                width: 50,
                                height: 21,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            toilet: new GameObject({
                                src: "assets/images/objects/toilet_color.png",
                                x: utils.withGrid(16.5),
                                y: utils.withGrid(15.5),
                                width: 20,
                                height: 25
                            }),
                            bathtub: new GameObject({
                                src: "assets/images/objects/bathtub_color.png",
                                x: utils.withGrid(23.5),
                                y: utils.withGrid(12.5),
                                width: 25,
                                height: 62
                            })
                        },
                        walls: window.wallGeneration(
                            window.wallGeneration(
                                window.wallGeneration(
                                    window.wallGeneration(
                                        window.wallGeneration(
                                            window.wallGeneration(
                                                window.wallGeneration(
                                                    window.wallGeneration(
                                                        window.wallGeneration(
                                                            window.wallGeneration(
                                                                window.wallGeneration(
                                                                    window.wallGeneration({},
                                                                        0.5, 0.5, 23, 17),
                                                                    9.5, 0.5, 1, 6),
                                                                10.5, 9.5, 0, 8),
                                                            14.5, 0.5, 1, 4),
                                                        14.5, 7.5, 1, 3),
                                                    14.5, 14.5, 1, 3),
                                                15.5, 10.5, 7, 0),
                                            15.5, 15.5, 7, 0),
                                        15.5, 1.5, 7, 0),
                                    1.5, 1.5, 9, 0),
                                9.5, 2.5, 0, 2),
                            3.5, 11.5, 4, 1),
                        cutsceneSpaces: {
                            [utils.asGridCoord(11.5, 16.5)]: [{
                                events: [
                                    {type: "changeMap", map: "Outside"}
                                ]
                            }],
                            [utils.asGridCoord(12.5, 16.5)]: [{
                                events: [
                                    {type: "changeMap", map: "Outside"}
                                ]
                            }],
                            [utils.asGridCoord(13.5, 16.5)]: [{
                                events: [
                                    {type: "changeMap", map: "Outside"}
                                ]
                            }]
                        },
                        entryCutscene: [
                            {type : "textMessage", text : "Mom?.. Dad?.."}
                        ]
                    };
            }
            break;


        case "Outside":
            switch (index) {
                case 0:
                    return {
                        id: "Outside",
                        lowerSrc: "assets/images/backgrounds/street.png",
                        upperSrc: "assets/images/backgrounds/street_upper.png",
                        music: "Calm",
                        gameObjects: {
                            hero: new Person({
                                isPlayerControlled: true,
                                x: utils.withGrid(2),
                                y: utils.withGrid(11)
                            }),
                            lamp1 : new GameObject({
                                x: utils.withGrid(3),
                                y : utils.withGrid(0),
                                src: "assets/images/backgrounds/lightpole_off.png",
                                width: 30,
                                height: 161
                            }),
                            lamp2 : new GameObject({
                                x: utils.withGrid(21),
                                y : utils.withGrid(0),
                                src: "assets/images/backgrounds/lightpole_off.png",
                                width: 30,
                                height: 161
                            }),
                            lamp3 : new GameObject({
                                x: utils.withGrid(39),
                                y : utils.withGrid(0),
                                src: "assets/images/backgrounds/lightpole_off.png",
                                width: 30,
                                height: 161
                            }),
                            lamp4 : new GameObject({
                                x: utils.withGrid(57),
                                y : utils.withGrid(0),
                                src: "assets/images/backgrounds/lightpole_off.png",
                                width: 30,
                                height: 161
                            })
                        },
                        walls: window.wallGeneration({},
                            0, 8, 63, 6),
                        cutsceneSpaces: {
                            [utils.asGridCoord(62,  9)]: [{
                                events: [
                                    {type: "changeMap", map: "GFFrontyard"}
                                ]
                            }],
                            [utils.asGridCoord(62,  10)]: [{
                                events: [
                                    {type: "changeMap", map: "GFFrontyard"}
                                ]
                            }],
                            [utils.asGridCoord(62,  11)]: [{
                                events: [
                                    {type: "changeMap", map: "GFFrontyard"}
                                ]
                            }],
                            [utils.asGridCoord(62,  12)]: [{
                                events: [
                                    {type: "changeMap", map: "GFFrontyard"}
                                ]
                            }],
                            [utils.asGridCoord(62,  13)]: [{
                                events: [
                                    {type: "changeMap", map: "GFFrontyard"}
                                ]
                            }]
                        }
                    };

                case 1:
                    return {
                        id: "Outside",
                        lowerSrc: "assets/images/backgrounds/street.png",
                        upperSrc: "assets/images/backgrounds/street_upper_dark.png",
                        music: "Calm",
                        gameObjects: {
                            hero: new Person({
                                isPlayerControlled: true,
                                x: utils.withGrid(2),
                                y: utils.withGrid(11)
                            }),
                            lamp1 : new GameObject({
                                x: utils.withGrid(3),
                                y : utils.withGrid(0),
                                src: "assets/images/backgrounds/lightpole.png",
                                width: 30,
                                height: 161
                            }),
                            light1 : new GameObject({
                                x: utils.withGrid(-2),
                                y: utils.withGrid(-4.5),
                                src: "assets/images/backgrounds/light.png",
                                width: 179,
                                height: 166
                            }),
                            lamp2 : new GameObject({
                                x: utils.withGrid(21),
                                y : utils.withGrid(0),
                                src: "assets/images/backgrounds/lightpole.png",
                                width: 30,
                                height: 161
                            }),
                            light2 : new GameObject({
                                x: utils.withGrid(16),
                                y: utils.withGrid(-4.5),
                                src: "assets/images/backgrounds/light.png",
                                width: 179,
                                height: 166
                            }),
                            lamp3 : new GameObject({
                                x: utils.withGrid(39),
                                y : utils.withGrid(0),
                                src: "assets/images/backgrounds/lightpole.png",
                                width: 30,
                                height: 161
                            }),
                            light3 : new GameObject({
                                x: utils.withGrid(34),
                                y: utils.withGrid(-4.5),
                                src: "assets/images/backgrounds/light.png",
                                width: 179,
                                height: 166
                            }),
                            lamp4 : new GameObject({
                                x: utils.withGrid(57),
                                y : utils.withGrid(0),
                                src: "assets/images/backgrounds/lightpole.png",
                                width: 30,
                                height: 161
                            }),
                            light4 : new GameObject({
                                x: utils.withGrid(52),
                                y: utils.withGrid(-4.5),
                                src: "assets/images/backgrounds/light.png",
                                width: 179,
                                height: 166
                            })
                        },
                        walls: window.wallGeneration({},
                            0, 8, 63, 6),
                        cutsceneSpaces: {
                            [utils.asGridCoord(62,  9)]: [{
                                events: [
                                    {type: "changeMap", map: "GFFrontyard"}
                                ]
                            }],
                            [utils.asGridCoord(62,  10)]: [{
                                events: [
                                    {type: "changeMap", map: "GFFrontyard"}
                                ]
                            }],
                            [utils.asGridCoord(62,  11)]: [{
                                events: [
                                    {type: "changeMap", map: "GFFrontyard"}
                                ]
                            }],
                            [utils.asGridCoord(62,  12)]: [{
                                events: [
                                    {type: "changeMap", map: "GFFrontyard"}
                                ]
                            }],
                            [utils.asGridCoord(62,  13)]: [{
                                events: [
                                    {type: "changeMap", map: "GFFrontyard"}
                                ]
                            }]
                        }
                    };

                case 2:
                    return {
                        id: "Outside",
                        lowerSrc: "assets/images/backgrounds/street.png",
                        upperSrc: "assets/images/backgrounds/street_upper_darker.png",
                        music: "Calm",
                        gameObjects: {
                            hero: new Person({
                                isPlayerControlled: true,
                                x: utils.withGrid(2),
                                y: utils.withGrid(11)
                            }),
                            lamp1 : new GameObject({
                                x: utils.withGrid(3),
                                y : utils.withGrid(0),
                                src: "assets/images/backgrounds/lightpole.png",
                                width: 30,
                                height: 161
                            }),
                            light1 : new GameObject({
                                x: utils.withGrid(-2),
                                y: utils.withGrid(-4.5),
                                src: "assets/images/backgrounds/light.png",
                                width: 179,
                                height: 166
                            }),
                            lamp2 : new GameObject({
                                x: utils.withGrid(21),
                                y : utils.withGrid(0),
                                src: "assets/images/backgrounds/lightpole.png",
                                width: 30,
                                height: 161
                            }),
                            light2 : new GameObject({
                                x: utils.withGrid(16),
                                y: utils.withGrid(-4.5),
                                src: "assets/images/backgrounds/light.png",
                                width: 179,
                                height: 166
                            }),
                            lamp3 : new GameObject({
                                x: utils.withGrid(39),
                                y : utils.withGrid(0),
                                src: "assets/images/backgrounds/lightpole.png",
                                width: 30,
                                height: 161
                            }),
                            light3 : new GameObject({
                                x: utils.withGrid(34),
                                y: utils.withGrid(-4.5),
                                src: "assets/images/backgrounds/light.png",
                                width: 179,
                                height: 166
                            }),
                            lamp4 : new GameObject({
                                x: utils.withGrid(57),
                                y : utils.withGrid(0),
                                src: "assets/images/backgrounds/lightpole.png",
                                width: 30,
                                height: 161
                            }),
                            light4 : new GameObject({
                                x: utils.withGrid(52),
                                y: utils.withGrid(-4.5),
                                src: "assets/images/backgrounds/light.png",
                                width: 179,
                                height: 166
                            })
                        },
                        walls: window.wallGeneration({},
                            0, 8, 63, 6),
                        cutsceneSpaces: {
                            [utils.asGridCoord(7, 9)] : [{
                                events : [
                                    {type: "removeObject", object: null, who: "lamp1", text: ""},
                                    {type: "addObject", name: "lamp1", inside: new GameObject({
                                            src: "assets/images/backgrounds/lightpole_off.png",
                                            x: utils.withGrid(3),
                                            y : utils.withGrid(0),
                                            width: 30,
                                            height: 161
                                        })},
                                    {type: "removeObject", object: null, who: "light1", text: ""}
                                ]
                            }],
                            [utils.asGridCoord(7, 10)] : [{
                                events : [
                                    {type: "removeObject", object: null, who: "lamp1", text: ""},
                                    {type: "addObject", name: "lamp1", inside: new GameObject({
                                            src: "assets/images/backgrounds/lightpole_off.png",
                                            x: utils.withGrid(3),
                                            y : utils.withGrid(0),
                                            width: 30,
                                            height: 161
                                        })},
                                    {type: "removeObject", object: null, who: "light1", text: ""}
                                ]
                            }],
                            [utils.asGridCoord(7, 11)] : [{
                                events : [
                                    {type: "removeObject", object: null, who: "lamp1", text: ""},
                                    {type: "addObject", name: "lamp1", inside: new GameObject({
                                            src: "assets/images/backgrounds/lightpole_off.png",
                                            x: utils.withGrid(3),
                                            y : utils.withGrid(0),
                                            width: 30,
                                            height: 161
                                        })},
                                    {type: "removeObject", object: null, who: "light1", text: ""}
                                ]
                            }],
                            [utils.asGridCoord(7, 12)] : [{
                                events : [
                                    {type: "removeObject", object: null, who: "lamp1", text: ""},
                                    {type: "addObject", name: "lamp1", inside: new GameObject({
                                            src: "assets/images/backgrounds/lightpole_off.png",
                                            x: utils.withGrid(3),
                                            y : utils.withGrid(0),
                                            width: 30,
                                            height: 161
                                        })},
                                    {type: "removeObject", object: null, who: "light1", text: ""}
                                ]
                            }],
                            [utils.asGridCoord(7, 13)] : [{
                                events : [
                                    {type: "removeObject", object: null, who: "lamp1", text: ""},
                                    {type: "addObject", name: "lamp1", inside: new GameObject({
                                            src: "assets/images/backgrounds/lightpole_off.png",
                                            x: utils.withGrid(3),
                                            y : utils.withGrid(0),
                                            width: 30,
                                            height: 161
                                        })},
                                    {type: "removeObject", object: null, who: "light1", text: ""}
                                ]
                            }],


                            [utils.asGridCoord(25, 9)] : [{
                                events : [
                                    {type: "removeObject", object: null, who: "lamp2", text: ""},
                                    {type: "addObject", name: "lamp2", inside: new GameObject({
                                            src: "assets/images/backgrounds/lightpole_off.png",
                                            x: utils.withGrid(21),
                                            y : utils.withGrid(0),
                                            width: 30,
                                            height: 161
                                        })},
                                    {type: "removeObject", object: null, who: "light2", text: ""}
                                ]
                            }],
                            [utils.asGridCoord(25, 10)] : [{
                                events : [
                                    {type: "removeObject", object: null, who: "lamp2", text: ""},
                                    {type: "addObject", name: "lamp2", inside: new GameObject({
                                            src: "assets/images/backgrounds/lightpole_off.png",
                                            x: utils.withGrid(21),
                                            y : utils.withGrid(0),
                                            width: 30,
                                            height: 161
                                        })},
                                    {type: "removeObject", object: null, who: "light2", text: ""}
                                ]
                            }],
                            [utils.asGridCoord(25, 11)] : [{
                                events : [
                                    {type: "removeObject", object: null, who: "lamp2", text: ""},
                                    {type: "addObject", name: "lamp2", inside: new GameObject({
                                            src: "assets/images/backgrounds/lightpole_off.png",
                                            x: utils.withGrid(21),
                                            y : utils.withGrid(0),
                                            width: 30,
                                            height: 161
                                        })},
                                    {type: "removeObject", object: null, who: "light2", text: ""}
                                ]
                            }],
                            [utils.asGridCoord(25, 12)] : [{
                                events : [
                                    {type: "removeObject", object: null, who: "lamp2", text: ""},
                                    {type: "addObject", name: "lamp2", inside: new GameObject({
                                            src: "assets/images/backgrounds/lightpole_off.png",
                                            x: utils.withGrid(21),
                                            y : utils.withGrid(0),
                                            width: 30,
                                            height: 161
                                        })},
                                    {type: "removeObject", object: null, who: "light2", text: ""}
                                ]
                            }],
                            [utils.asGridCoord(25, 13)] : [{
                                events : [
                                    {type: "removeObject", object: null, who: "lamp2", text: ""},
                                    {type: "addObject", name: "lamp2", inside: new GameObject({
                                            src: "assets/images/backgrounds/lightpole_off.png",
                                            x: utils.withGrid(21),
                                            y : utils.withGrid(0),
                                            width: 30,
                                            height: 161
                                        })},
                                    {type: "removeObject", object: null, who: "light2", text: ""}
                                ]
                            }],


                            [utils.asGridCoord(44, 9)] : [{
                                events : [
                                    {type: "removeObject", object: null, who: "lamp3", text: ""},
                                    {type: "addObject", name: "lamp3", inside: new GameObject({
                                            src: "assets/images/backgrounds/lightpole_off.png",
                                            x: utils.withGrid(39),
                                            y : utils.withGrid(0),
                                            width: 30,
                                            height: 161
                                        })},
                                    {type: "removeObject", object: null, who: "light3", text: ""}
                                ]
                            }],
                            [utils.asGridCoord(44, 10)] : [{
                                events : [
                                    {type: "removeObject", object: null, who: "lamp3", text: ""},
                                    {type: "addObject", name: "lamp3", inside: new GameObject({
                                            src: "assets/images/backgrounds/lightpole_off.png",
                                            x: utils.withGrid(39),
                                            y : utils.withGrid(0),
                                            width: 30,
                                            height: 161
                                        })},
                                    {type: "removeObject", object: null, who: "light3", text: ""}
                                ]
                            }],
                            [utils.asGridCoord(44, 11)] : [{
                                events : [
                                    {type: "removeObject", object: null, who: "lamp3", text: ""},
                                    {type: "addObject", name: "lamp3", inside: new GameObject({
                                            src: "assets/images/backgrounds/lightpole_off.png",
                                            x: utils.withGrid(39),
                                            y : utils.withGrid(0),
                                            width: 30,
                                            height: 161
                                        })},
                                    {type: "removeObject", object: null, who: "light3", text: ""}
                                ]
                            }],
                            [utils.asGridCoord(44, 12)] : [{
                                events : [
                                    {type: "removeObject", object: null, who: "lamp3", text: ""},
                                    {type: "addObject", name: "lamp3", inside: new GameObject({
                                            src: "assets/images/backgrounds/lightpole_off.png",
                                            x: utils.withGrid(39),
                                            y : utils.withGrid(0),
                                            width: 30,
                                            height: 161
                                        })},
                                    {type: "removeObject", object: null, who: "light3", text: ""}
                                ]
                            }],
                            [utils.asGridCoord(44, 13)] : [{
                                events : [
                                    {type: "removeObject", object: null, who: "lamp3", text: ""},
                                    {type: "addObject", name: "lamp3", inside: new GameObject({
                                            src: "assets/images/backgrounds/lightpole_off.png",
                                            x: utils.withGrid(39),
                                            y : utils.withGrid(0),
                                            width: 30,
                                            height: 161
                                        })},
                                    {type: "removeObject", object: null, who: "light3", text: ""}
                                ]
                            }],


                            [utils.asGridCoord(62,  9)]: [{
                                events: [
                                    {type: "removeObject", object: null, who: "lamp4", text: ""},
                                    {type: "addObject", name: "lightpoleguy", inside: new GameObject({
                                            src: "assets/images/backgrounds/lightpole_guy.png",
                                            x: utils.withGrid(57),
                                            y : utils.withGrid(0),
                                            width: 30,
                                            height: 161
                                        })},
                                    {type: "changeMap", map: "GFBackyard"}
                                ]
                            }],
                            [utils.asGridCoord(62,  10)]: [{
                                events: [
                                    {type: "playScare", src: "scare1"},
                                    {type: "removeObject", object: null, who: "lamp4", text: ""},
                                    {type: "addObject", name: "lightpoleguy", inside: new GameObject({
                                            src: "assets/images/backgrounds/lightpole_guy.png",
                                            x: utils.withGrid(57),
                                            y : utils.withGrid(0),
                                            width: 30,
                                            height: 161
                                        })},
                                    {type: "changeMap", map: "GFBackyard"}
                                ]
                            }],
                            [utils.asGridCoord(62,  11)]: [{
                                events: [
                                    {type: "playScare", src: "scare1"},
                                    {type: "removeObject", object: null, who: "lamp4", text: ""},
                                    {type: "addObject", name: "lightpoleguy", inside: new GameObject({
                                            src: "assets/images/backgrounds/lightpole_guy.png",
                                            x: utils.withGrid(57),
                                            y : utils.withGrid(0),
                                            width: 30,
                                            height: 161
                                        })},
                                    {type: "changeMap", map: "GFBackyard"}
                                ]
                            }],
                            [utils.asGridCoord(62,  12)]: [{
                                events: [
                                    {type: "playScare", src: "scare1"},
                                    {type: "removeObject", object: null, who: "lamp4", text: ""},
                                    {type: "addObject", name: "lightpoleguy", inside: new GameObject({
                                            src: "assets/images/backgrounds/lightpole_guy.png",
                                            x: utils.withGrid(57),
                                            y : utils.withGrid(0),
                                            width: 30,
                                            height: 161
                                        })},
                                    {type: "changeMap", map: "GFBackyard"}
                                ]
                            }],
                            [utils.asGridCoord(62,  13)]: [{
                                events: [
                                    {type: "playScare", src: "scare1"},
                                    {type: "removeObject", object: null, who: "lamp4", text: ""},
                                    {type: "addObject", name: "lightpoleguy", inside: new GameObject({
                                            src: "assets/images/backgrounds/lightpole_guy.png",
                                            x: utils.withGrid(57),
                                            y : utils.withGrid(0),
                                            width: 30,
                                            height: 161
                                        })},
                                    {type: "changeMap", map: "GFBackyard"}
                                ]
                            }]
                        }
                    };

                case 3:
                    return {
                        id: "Outside",
                        lowerSrc: "assets/images/backgrounds/street.png",
                        upperSrc: "assets/images/backgrounds/street_upper_darkest.png",
                        music: "Calm",
                        gameObjects: {
                            hero: new Person({
                                isPlayerControlled: true,
                                x: utils.withGrid(2),
                                y: utils.withGrid(11)
                            }),
                            lamp1 : new GameObject({
                                x: utils.withGrid(3),
                                y : utils.withGrid(0),
                                src: "assets/images/backgrounds/lightpole_guy.png",
                                width: 30,
                                height: 161
                            }),
                            lamp2 : new GameObject({
                                x: utils.withGrid(21),
                                y : utils.withGrid(0),
                                src: "assets/images/backgrounds/lightpole_guy.png",
                                width: 30,
                                height: 161
                            }),
                            lamp3 : new GameObject({
                                x: utils.withGrid(39),
                                y : utils.withGrid(0),
                                src: "assets/images/backgrounds/lightpole_guy.png",
                                width: 30,
                                height: 161
                            }),
                            lamp4 : new GameObject({
                                x: utils.withGrid(57),
                                y : utils.withGrid(0),
                                src: "assets/images/backgrounds/lightpole_guy.png",
                                width: 30,
                                height: 161
                            })
                        },
                        walls: window.wallGeneration({},
                            0, 8, 63, 6),
                        cutsceneSpaces: {
                            [utils.asGridCoord(62,  9)]: [{
                                events: [
                                    {type: "changeMap", map: "GFBackyard"}
                                ]
                            }],
                            [utils.asGridCoord(62,  10)]: [{
                                events: [
                                    {type: "changeMap", map: "GFBackyard"}
                                ]
                            }],
                            [utils.asGridCoord(62,  11)]: [{
                                events: [
                                    {type: "changeMap", map: "GFBackyard"}
                                ]
                            }],
                            [utils.asGridCoord(62,  12)]: [{
                                events: [
                                    {type: "changeMap", map: "GFBackyard"}
                                ]
                            }],
                            [utils.asGridCoord(62,  13)]: [{
                                events: [
                                    {type: "changeMap", map: "GFBackyard"}
                                ]
                            }]
                        }
                    };

                case 4:
                    return {
                        id: "Outside",
                        lowerSrc: "assets/images/backgrounds/street.png",
                        upperSrc: "assets/images/backgrounds/street_upper_darkest.png",
                        music: "Calm",
                        gameObjects: {
                            hero: new Person({
                                isPlayerControlled: true,
                                x: utils.withGrid(2),
                                y: utils.withGrid(11)
                            }),
                            lamp1 : new GameObject({
                                x: utils.withGrid(3),
                                y : utils.withGrid(0),
                                src: "assets/images/backgrounds/lightpole_off.png",
                                width: 30,
                                height: 161
                            }),
                            lamp2 : new GameObject({
                                x: utils.withGrid(21),
                                y : utils.withGrid(0),
                                src: "assets/images/backgrounds/lightpole_off.png",
                                width: 30,
                                height: 161
                            }),
                            lamp3 : new GameObject({
                                x: utils.withGrid(39),
                                y : utils.withGrid(0),
                                src: "assets/images/backgrounds/lightpole_off.png",
                                width: 30,
                                height: 161
                            }),
                            lamp4 : new GameObject({
                                x: utils.withGrid(57),
                                y : utils.withGrid(0),
                                src: "assets/images/backgrounds/lightpole_off.png",
                                width: 30,
                                height: 161
                            })
                        },
                        walls: window.wallGeneration({},
                            0, 8, 63, 6),
                        cutsceneSpaces: {
                            [utils.asGridCoord(62,  9)]: [{
                                events: [
                                    {type: "changeMap", map: "GFFrontyard"}
                                ]
                            }],
                            [utils.asGridCoord(62,  10)]: [{
                                events: [
                                    {type: "changeMap", map: "GFFrontyard"}
                                ]
                            }],
                            [utils.asGridCoord(62,  11)]: [{
                                events: [
                                    {type: "changeMap", map: "GFFrontyard"}
                                ]
                            }],
                            [utils.asGridCoord(62,  12)]: [{
                                events: [
                                    {type: "changeMap", map: "GFFrontyard"}
                                ]
                            }],
                            [utils.asGridCoord(62,  13)]: [{
                                events: [
                                    {type: "changeMap", map: "GFFrontyard"}
                                ]
                            }]
                        }
                    };
            }
            break;


        case "GFFrontyard":
            switch (index) {
                case 0:
                    return {
                        id: "GFFrontyard",
                        lowerSrc: "assets/images/backgrounds/frontyard.png",
                        upperSrc: "",
                        music: "Calm",
                        gameObjects: {
                            hero: new Person({
                                isPlayerControlled: true,
                                x: utils.withGrid(9),
                                y: utils.withGrid(11),
                            })
                        },
                        walls: window.wallGeneration({},
                            0, 1, 19, 13),
                        cutsceneSpaces: {
                            [utils.asGridCoord(8,  2)]: [{
                                events: [
                                    {type: "changeMap", map: "GFFirstFloor"}
                                ]
                            }],
                            [utils.asGridCoord(9,  2)]: [{
                                events: [
                                    {type: "changeMap", map: "GFFirstFloor"}
                                ]
                            }],
                            [utils.asGridCoord(10,  2)]: [{
                                events: [
                                    {type: "changeMap", map: "GFFirstFloor"}
                                ]
                            }],
                            [utils.asGridCoord(11,  2)]: [{
                                events: [
                                    {type: "changeMap", map: "GFFirstFloor"}
                                ]
                            }]
                        }
                    };

                case 1:
                    return {
                        id: "GFFrontyard",
                        lowerSrc: "assets/images/backgrounds/frontyard.png",
                        upperSrc: "assets/images/backgrounds/dark.png",
                        music: "Calm",
                        gameObjects: {
                            hero: new Person({
                                isPlayerControlled: true,
                                x: utils.withGrid(9),
                                y: utils.withGrid(11),
                            })
                        },
                        walls: window.wallGeneration({},
                            0, 1, 19, 13),
                        cutsceneSpaces: {
                            [utils.asGridCoord(8,  2)]: [{
                                events: [
                                    {who: "hero", type: "walk", direction: "down", time: 0},
                                    {type: "textMessage", text: "Ugh. They closed the front door, I have to walk around."},
                                    {who: "hero", type: "walk", direction: "down", time: 6},
                                    {type: "changeMap", map: "GFBackyard"}
                                ]
                            }],
                            [utils.asGridCoord(9,  2)]: [{
                                events: [
                                    {who: "hero", type: "walk", direction: "down", time: 0},
                                    {type: "textMessage", text: "Ugh. They closed the front door, I have to walk around."},
                                    {who: "hero", type: "walk", direction: "down", time: 6},
                                    {type: "changeMap", map: "GFBackyard"}
                                ]
                            }],
                            [utils.asGridCoord(10,  2)]: [{
                                events: [
                                    {who: "hero", type: "walk", direction: "down", time: 0},
                                    {type: "textMessage", text: "Ugh. They closed the front door, I have to walk around."},
                                    {who: "hero", type: "walk", direction: "down", time: 6},
                                    {type: "changeMap", map: "GFBackyard"}
                                ]
                            }],
                            [utils.asGridCoord(11,  2)]: [{
                                events: [
                                    {who: "hero", type: "walk", direction: "down", time: 0},
                                    {type: "textMessage", text: "Ugh. They closed the front door, I have to walk around."},
                                    {who: "hero", type: "walk", direction: "down", time: 6},
                                    {type: "changeMap", map: "GFBackyard"}
                                ]
                            }]
                        }
                    };

                case 4:
                    return {
                        id: "GFFrontyard",
                        lowerSrc: "assets/images/backgrounds/frontyard.png",
                        upperSrc: "assets/images/backgrounds/darkest.png",
                        music: "Calm",
                        gameObjects: {
                            hero: new Person({
                                isPlayerControlled: true,
                                x: utils.withGrid(9),
                                y: utils.withGrid(11),
                            })
                        },
                        walls: window.wallGeneration({},
                            0, 1, 19, 13),
                        cutsceneSpaces: {
                            [utils.asGridCoord(8,  2)]: [{
                                events: [
                                    {type: "changeMap", map: "GFFirstFloor"}
                                ]
                            }],
                            [utils.asGridCoord(9,  2)]: [{
                                events: [
                                    {type: "changeMap", map: "GFFirstFloor"}
                                ]
                            }],
                            [utils.asGridCoord(10,  2)]: [{
                                events: [
                                    {type: "changeMap", map: "GFFirstFloor"}
                                ]
                            }],
                            [utils.asGridCoord(11,  2)]: [{
                                events: [
                                    {type: "changeMap", map: "GFFirstFloor"}
                                ]
                            }]
                        },
                        entryCutscene: [
                            {type : "textMessage", text : "I don't care anymore."},
                            {type : "textMessage", text : "I'll go through the front door."},
                            {type : "textMessage", text : "They can kick me out, if they want."}
                        ]
                    };
            }
            break;


        case "GFBackyard":
            switch (index) {
                case 1:
                    return {
                        id: "GFBackyard",
                        lowerSrc: "assets/images/backgrounds/backyard.png",
                        upperSrc: "assets/images/backgrounds/dark.png",
                        music: "Calm",
                        gameObjects: {
                            hero: new Person({
                                isPlayerControlled: true,
                                x: utils.withGrid(18),
                                y: utils.withGrid(7)
                            }),
                            dog: new Person({
                                isEnemy: true,
                                x: utils.withGrid(5),
                                y: utils.withGrid(6),
                                src: "assets/images/characters/dog.png",
                                behaviorLoop: [
                                    {type: "walk", direction: "random", time: -1}
                                ]
                            }),
                            bush1: new GameObject({
                                src: "assets/images/objects/bush1.png",
                                x: utils.withGrid(0),
                                y: utils.withGrid(2),
                                width: 40,
                                height: 44,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            bush2: new GameObject({
                                src: "assets/images/objects/bush2.png",
                                x: utils.withGrid(14),
                                y: utils.withGrid(2),
                                width: 77,
                                height: 45,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            bush3: new GameObject({
                                src: "assets/images/objects/bush3.png",
                                x: utils.withGrid(2),
                                y: utils.withGrid(8),
                                width: 81,
                                height: 47,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            bush4: new GameObject({
                                src: "assets/images/objects/bush4.png",
                                x: utils.withGrid(17),
                                y: utils.withGrid(8),
                                width: 62,
                                height: 49,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            })
                        },
                        walls: window.wallGeneration({},
                            0, 1, 19, 13),
                        cutsceneSpaces: {
                            [utils.asGridCoord(7,  2)]: [{
                                events: [
                                    {type: "changeMap", map: "GFFirstFloor"}
                                ]
                            }],
                            [utils.asGridCoord(8,  2)]: [{
                                events: [
                                    {type: "changeMap", map: "GFFirstFloor"}
                                ]
                            }],
                            [utils.asGridCoord(9,  2)]: [{
                                events: [
                                    {type: "changeMap", map: "GFFirstFloor"}
                                ]
                            }],
                            [utils.asGridCoord(10,  2)]: [{
                                events: [
                                    {type: "changeMap", map: "GFFirstFloor"}
                                ]
                            }],
                            [utils.asGridCoord(11,  2)]: [{
                                events: [
                                    {type: "changeMap", map: "GFFirstFloor"}
                                ]
                            }],
                            [utils.asGridCoord(12,  2)]: [{
                                events: [
                                    {type: "changeMap", map: "GFFirstFloor"}
                                ]
                            }]
                        },
                        entryCutscene: [
                            {type : "textMessage", text : "Dang it, I forgot they had a dog..."},
                            {type : "textMessage", text : "I have to be careful"},
                            {type : "textMessage", text : "I can hide in the bushes and walk around it."},
                        ]
                    };

                case 2:
                    return {
                        id: "GFBackyard",
                        lowerSrc: "assets/images/backgrounds/backyard.png",
                        upperSrc: "assets/images/backgrounds/darker.png",
                        music: "Calm",
                        gameObjects: {
                            hero: new Person({
                                isPlayerControlled: true,
                                x: utils.withGrid(9),
                                y: utils.withGrid(12)
                            }),
                            dog: new Person({
                                isEnemy: true,
                                x: utils.withGrid(5),
                                y: utils.withGrid(6),
                                src: "assets/images/characters/dog.png",
                                behaviorLoop: [
                                    {type: "walk", direction: "random", time: -1}
                                ]
                            }),
                            bush1: new GameObject({
                                src: "assets/images/objects/bush1.png",
                                x: utils.withGrid(0),
                                y: utils.withGrid(2),
                                width: 40,
                                height: 44,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            bush2: new GameObject({
                                src: "assets/images/objects/bush2.png",
                                x: utils.withGrid(14),
                                y: utils.withGrid(2),
                                width: 77,
                                height: 45,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            bush3: new GameObject({
                                src: "assets/images/objects/bush3.png",
                                x: utils.withGrid(2),
                                y: utils.withGrid(8),
                                width: 81,
                                height: 47,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            bush4: new GameObject({
                                src: "assets/images/objects/bush4.png",
                                x: utils.withGrid(17),
                                y: utils.withGrid(8),
                                width: 62,
                                height: 49,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            })
                        },
                        walls: window.wallGeneration({},
                            0, 1, 19, 13),
                        cutsceneSpaces: {
                            [utils.asGridCoord(7,  2)]: [{
                                events: [
                                    {type: "changeMap", map: "GFFirstFloor"}
                                ]
                            }],
                            [utils.asGridCoord(8,  2)]: [{
                                events: [
                                    {type: "changeMap", map: "GFFirstFloor"}
                                ]
                            }],
                            [utils.asGridCoord(9,  2)]: [{
                                events: [
                                    {type: "changeMap", map: "GFFirstFloor"}
                                ]
                            }],
                            [utils.asGridCoord(10,  2)]: [{
                                events: [
                                    {type: "changeMap", map: "GFFirstFloor"}
                                ]
                            }],
                            [utils.asGridCoord(11,  2)]: [{
                                events: [
                                    {type: "changeMap", map: "GFFirstFloor"}
                                ]
                            }],
                            [utils.asGridCoord(12,  2)]: [{
                                events: [
                                    {type: "changeMap", map: "GFFirstFloor"}
                                ]
                            }]
                        },
                        entryCutscene: [
                            {type : "textMessage", text : "The front door is likely locked."},
                            {type : "textMessage", text : "Too lazy to check."}
                        ]
                    };

                case 3:
                    return {
                        id: "GFBackyard",
                        lowerSrc: "assets/images/backgrounds/backyard.png",
                        upperSrc: "assets/images/backgrounds/darkest.png",
                        music: "Calm",
                        gameObjects: {
                            hero: new Person({
                                isPlayerControlled: true,
                                x: utils.withGrid(9),
                                y: utils.withGrid(12)
                            }),
                            dog: new Person({
                                isEnemy: true,
                                x: utils.withGrid(5),
                                y: utils.withGrid(6),
                                src: "assets/images/characters/dog.png",
                                behaviorLoop: [
                                    {type: "walk", direction: "random", time: -1}
                                ]
                            }),
                            bush1: new GameObject({
                                src: "assets/images/objects/bush1.png",
                                x: utils.withGrid(0),
                                y: utils.withGrid(2),
                                width: 40,
                                height: 44,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            bush2: new GameObject({
                                src: "assets/images/objects/bush2.png",
                                x: utils.withGrid(14),
                                y: utils.withGrid(2),
                                width: 77,
                                height: 45,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            bush3: new GameObject({
                                src: "assets/images/objects/bush3.png",
                                x: utils.withGrid(2),
                                y: utils.withGrid(8),
                                width: 81,
                                height: 47,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            bush4: new GameObject({
                                src: "assets/images/objects/bush4.png",
                                x: utils.withGrid(17),
                                y: utils.withGrid(8),
                                width: 62,
                                height: 49,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            })
                        },
                        walls: window.wallGeneration({},
                            0, 1, 19, 13),
                        cutsceneSpaces: {
                            [utils.asGridCoord(7,  2)]: [{
                                events: [
                                    {type: "changeMap", map: "GFFirstFloor"}
                                ]
                            }],
                            [utils.asGridCoord(8,  2)]: [{
                                events: [
                                    {type: "changeMap", map: "GFFirstFloor"}
                                ]
                            }],
                            [utils.asGridCoord(9,  2)]: [{
                                events: [
                                    {type: "changeMap", map: "GFFirstFloor"}
                                ]
                            }],
                            [utils.asGridCoord(10,  2)]: [{
                                events: [
                                    {type: "changeMap", map: "GFFirstFloor"}
                                ]
                            }],
                            [utils.asGridCoord(11,  2)]: [{
                                events: [
                                    {type: "changeMap", map: "GFFirstFloor"}
                                ]
                            }],
                            [utils.asGridCoord(12,  2)]: [{
                                events: [
                                    {type: "changeMap", map: "GFFirstFloor"}
                                ]
                            }]
                        },
                        entryCutscene: [
                            {type : "textMessage", text : "The front door is likely locked."},
                            {type : "textMessage", text : "Too lazy to check."}
                        ]
                    };
            }
            break;


        case "GFFirstFloor":
            switch (index) {
                case 0:
                    return {
                        id: "GFFirstFloor",
                        lowerSrc: "assets/images/backgrounds/gf_first_floor.png",
                        upperSrc: "",
                        music: "Calm",
                        gameObjects: {
                            hero: new Person({
                                isPlayerControlled: true,
                                x: utils.withGrid(12),
                                y: utils.withGrid(16)
                            }),
                            npc1: new Person({
                                isEnemy: true,
                                x: utils.withGrid(17),
                                y: utils.withGrid(14),
                                src: "assets/images/characters/gf_dad.png",
                                behaviorLoop: [
                                    {type: "stand", direction: "", time: -1}
                                ]
                            }),
                            npc2: new Person({
                                isEnemy: true,
                                x: utils.withGrid(23),
                                y: utils.withGrid(14),
                                src: "assets/images/characters/gf_mom.png",
                                behaviorLoop: [
                                    {type: "stand", direction: "", time: -1}
                                ]
                            }),
                            hidingSpot: new Person({
                                x: utils.withGrid(9),
                                y: utils.withGrid(2),
                                src: "assets/images/characters/invisible_guy.png",
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            tv: new GameObject({
                                src: "assets/images/objects/tv.png",
                                x: utils.withGrid(22),
                                y: utils.withGrid(1),
                                width: 46,
                                height: 47
                            }),
                            chair: new GameObject({
                                src: "assets/images/objects/chair.png",
                                x: utils.withGrid(19),
                                y: utils.withGrid(2),
                                width: 40,
                                height: 39
                            }),
                            sofa: new GameObject({
                                src: "assets/images/objects/sofa.png",
                                x: utils.withGrid(21),
                                y: utils.withGrid(5),
                                width: 64,
                                height: 27
                            }),
                            cupboard: new GameObject({
                                src: "assets/images/objects/cupboard.png",
                                x: utils.withGrid(16),
                                y: utils.withGrid(2),
                                width: 29,
                                height: 77,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            table: new GameObject({
                                src: "assets/images/objects/table.png",
                                x: utils.withGrid(18),
                                y: utils.withGrid(11),
                                width: 82,
                                height: 61,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            chairtop: new GameObject({
                                src: "assets/images/objects/chairtop.png",
                                x: utils.withGrid(20),
                                y: utils.withGrid(10),
                                width: 14,
                                height: 18,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            chairbottom: new GameObject({
                                src: "assets/images/objects/chairbottom.png",
                                x: utils.withGrid(20),
                                y: utils.withGrid(15),
                                width: 15,
                                height: 28,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            chairleft: new GameObject({
                                src: "assets/images/objects/chairleft.png",
                                x: utils.withGrid(16),
                                y: utils.withGrid(12),
                                width: 22,
                                height: 35,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            chairright: new GameObject({
                                src: "assets/images/objects/chairright.png",
                                x: utils.withGrid(24),
                                y: utils.withGrid(12),
                                width: 18,
                                height: 35,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            kitchen: new GameObject({
                                src: "assets/images/objects/kitchen.png",
                                x: utils.withGrid(1.5),
                                y: utils.withGrid(1.5),
                                width: 146,
                                height: 127,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            plant: new GameObject({
                                src: "assets/images/objects/plant.png",
                                x: utils.withGrid(9),
                                y: utils.withGrid(10),
                                width: 23,
                                height: 29
                            }),
                            sink: new GameObject({
                                src: "assets/images/objects/sink.png",
                                x: utils.withGrid(4),
                                y: utils.withGrid(12),
                                width: 50,
                                height: 21,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            toilet: new GameObject({
                                src: "assets/images/objects/toilet.png",
                                x: utils.withGrid(9),
                                y: utils.withGrid(15),
                                width: 20,
                                height: 25
                            }),
                            bathtub: new GameObject({
                                src: "assets/images/objects/bathtub.png",
                                x: utils.withGrid(2),
                                y: utils.withGrid(13),
                                width: 25,
                                height: 62
                            })
                        },
                        walls: window.wallGeneration(
                            window.wallGeneration(
                            window.wallGeneration(
                            window.wallGeneration(
                            window.wallGeneration(
                                window.wallGeneration(
                                    window.wallGeneration(
                                        window.wallGeneration(
                                            window.wallGeneration(
                                                window.wallGeneration(
                                                    window.wallGeneration(
                                                        window.wallGeneration({},
                                                            1, 0, 24, 18),
                                                        10, 0, 1, 5),
                                                    10, 8, 1, 3),
                                                10, 14, 1, 3),
                                            14, 0, 1, 7),
                                        14, 10, 1, 7),
                                    1, 11, 7, 0),
                                2, 17, 7, 0),
                        2, 2, 7, 0),
                        16, 1, 8, 0),
                            16, 3, 0, 3),
                            18, 12, 4, 1),
                            cutsceneSpaces: {
                                [utils.asGridCoord(12, 2)]: [{
                                    events: [
                                        {type: "changeMap", map: "GFSecondFloor"}
                                    ]
                                }],
                                [utils.asGridCoord(13, 2)]: [{
                                    events: [
                                        {type: "changeMap", map: "GFSecondFloor"}
                                    ]
                                }]
                            },
                            entryCutscene: [
                                {type: "textMessage", text: "It seems her parents are busy."},
                                {type: "textMessage", text: "I can sneak past them."}
                            ]
                    };

                case 1:
                    return {
                        id: "GFFirstFloor",
                        lowerSrc: "assets/images/backgrounds/gf_first_floor.png",
                        upperSrc: "",
                        music: "Calm",
                        gameObjects: {
                            hero: new Person({
                                isPlayerControlled: true,
                                x: utils.withGrid(18),
                                y: utils.withGrid(3)
                            }),
                            npc1: new Person({
                                isEnemy: true,
                                x: utils.withGrid(21),
                                y: utils.withGrid(8),
                                src: "assets/images/characters/gf_dad.png",
                                behaviorLoop: [
                                    {type: "walk", direction: "random", time: -1},
                                    {type: "stand", direction: "", time: -1}
                                ]
                            }),
                            npc2: new Person({
                                isEnemy: true,
                                x: utils.withGrid(7),
                                y: utils.withGrid(4),
                                src: "assets/images/characters/gf_mom.png",
                                returnAfterChase: true,
                                behaviorLoop: [
                                    {type: "stand", direction: "", time: -1},
                                    {type: "walk", direction: "left", time: 5},
                                    {type: "stand", direction: "", time: -1},
                                    {type: "walk", direction: "down", time: 4},
                                    {type: "stand", direction: "", time: -1},
                                    {type: "walk", direction: "right", time: 5},
                                    {type: "walk", direction: "up", time: 4},
                                ]
                            }),
                            hidingSpot: new Person({
                                x: utils.withGrid(9),
                                y: utils.withGrid(2),
                                src: "assets/images/characters/invisible_guy.png",
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            tv: new GameObject({
                                src: "assets/images/objects/tv.png",
                                x: utils.withGrid(22),
                                y: utils.withGrid(1),
                                width: 46,
                                height: 47
                            }),
                            chair: new GameObject({
                                src: "assets/images/objects/chair.png",
                                x: utils.withGrid(19),
                                y: utils.withGrid(2),
                                width: 40,
                                height: 39
                            }),
                            sofa: new GameObject({
                                src: "assets/images/objects/sofa.png",
                                x: utils.withGrid(21),
                                y: utils.withGrid(5),
                                width: 64,
                                height: 27
                            }),
                            cupboard: new GameObject({
                                src: "assets/images/objects/cupboard.png",
                                x: utils.withGrid(16),
                                y: utils.withGrid(2),
                                width: 29,
                                height: 77,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            table: new GameObject({
                                src: "assets/images/objects/table.png",
                                x: utils.withGrid(18),
                                y: utils.withGrid(11),
                                width: 82,
                                height: 61,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            chairtop: new GameObject({
                                src: "assets/images/objects/chairtop.png",
                                x: utils.withGrid(20),
                                y: utils.withGrid(10),
                                width: 14,
                                height: 18,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            chairbottom: new GameObject({
                                src: "assets/images/objects/chairbottom.png",
                                x: utils.withGrid(20),
                                y: utils.withGrid(15),
                                width: 15,
                                height: 28,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            chairleft: new GameObject({
                                src: "assets/images/objects/chairleft.png",
                                x: utils.withGrid(16),
                                y: utils.withGrid(12),
                                width: 22,
                                height: 35,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            chairright: new GameObject({
                                src: "assets/images/objects/chairright.png",
                                x: utils.withGrid(24),
                                y: utils.withGrid(12),
                                width: 18,
                                height: 35,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            kitchen: new GameObject({
                                src: "assets/images/objects/kitchen.png",
                                x: utils.withGrid(1.5),
                                y: utils.withGrid(1.5),
                                width: 146,
                                height: 127,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            plant: new GameObject({
                                src: "assets/images/objects/plant.png",
                                x: utils.withGrid(9),
                                y: utils.withGrid(10),
                                width: 23,
                                height: 29
                            }),
                            sink: new GameObject({
                                src: "assets/images/objects/sink.png",
                                x: utils.withGrid(4),
                                y: utils.withGrid(12),
                                width: 50,
                                height: 21,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            toilet: new GameObject({
                                src: "assets/images/objects/toilet.png",
                                x: utils.withGrid(9),
                                y: utils.withGrid(15),
                                width: 20,
                                height: 25
                            }),
                            bathtub: new GameObject({
                                src: "assets/images/objects/bathtub.png",
                                x: utils.withGrid(2),
                                y: utils.withGrid(13),
                                width: 25,
                                height: 62
                            })
                        },
                        walls: window.wallGeneration(
                            window.wallGeneration(
                                window.wallGeneration(
                                    window.wallGeneration(
                                        window.wallGeneration(
                                            window.wallGeneration(
                                                window.wallGeneration(
                                                    window.wallGeneration(
                                                        window.wallGeneration(
                                                            window.wallGeneration(
                                                                window.wallGeneration(
                                                                    window.wallGeneration({},
                                                                        1, 0, 24, 18),
                                                                    10, 0, 1, 5),
                                                                10, 8, 1, 3),
                                                            10, 14, 1, 3),
                                                        14, 0, 1, 7),
                                                    14, 10, 1, 7),
                                                1, 11, 7, 0),
                                            2, 17, 7, 0),
                                        2, 2, 7, 0),
                                    16, 1, 8, 0),
                                16, 3, 0, 3),
                            18, 12, 4, 1),
                        cutsceneSpaces: {
                            [utils.asGridCoord(12, 2)]: [{
                                events: [
                                    {type: "changeMap", map: "GFSecondFloor"}
                                ]
                            }],
                            [utils.asGridCoord(13, 2)]: [{
                                events: [
                                    {type: "changeMap", map: "GFSecondFloor"}
                                ]
                            }]
                        },
                        entryCutscene: [
                            {type: "textMessage", text: "I have to be careful."},
                            {type: "textMessage", text: "I can hide in some spots if needed."}
                        ]
                    };

                case 2:
                    return {
                        id: "GFFirstFloor",
                        lowerSrc: "assets/images/backgrounds/gf_first_floor.png",
                        upperSrc: "",
                        music: "Calm",
                        gameObjects: {
                            key: new Items({
                                x: utils.withGrid(22),
                                y: utils.withGrid(13),
                                src: "assets/images/items/key.png",
                                talking: [{
                                    events: [
                                        {type: "itemPicked", who: "key"}
                                    ]
                                }]
                            }),
                            pills: new Items({
                                x: utils.withGrid(6),
                                y: utils.withGrid(14),
                                src: "assets/images/items/pills.png",
                                talking: [{
                                    events: [
                                        {type: "textMessage", text: "'Sleeping pills'..."},
                                        {type: "textMessage", text: "If I add it to his food, I can sneak past and get the key."},
                                        {type: "textMessage", text: "He eats it too fast though.."},
                                        {type: "textMessage", text: "I should add it to the main dish, in the fridge."},
                                        {type: "itemPicked", who: "pills"}
                                    ]
                                }]
                            }),
                            fridge: new Person({
                                x: utils.withGrid(1),
                                y: utils.withGrid(8),
                                src: "assets/images/characters/invisible_guy.png",
                                talking: [{
                                    events: [
                                        {type: "removeObject", object: "pills", who: "fridge", text: "There is food inside. I could add something.."}
                                    ]
                                }]
                            }),
                            hero: new Person({
                                isPlayerControlled: true,
                                x: utils.withGrid(18),
                                y: utils.withGrid(3)
                            }),
                            npc1: new Person({
                                isEnemy: true,
                                x: utils.withGrid(24),
                                y: utils.withGrid(9),
                                returnAfterChase: true,
                                src: "assets/images/characters/gf_dad.png",
                                behaviorLoop: [
                                    {type: "stand", direction: "", time: -1},
                                    {type: "walk", direction: "left", time: 7},
                                    {type: "stand", direction: "", time: -1},
                                    {type: "walk", direction: "right", time: 7},
                                    {type: "checkChange", object: "food", additions: [
                                            {who: "npc1", type: "walk", direction: "left", time: 7},
                                            {who: "npc1", type: "walk", direction: "down", time: 2},
                                            {who: "npc1", type: "stand", direction: "", time: 100},
                                            {type: "removeObject", object: null, who: "food", text: ""},
                                            {who: "npc1", type: "walk", direction: "up", time: 2},
                                            {who: "npc1", type: "walk", direction: "right", time: 7},
                                        ]},
                                    {type: "checkChange", object: "sleeping_state", additions: [
                                            {who: "npc1", type: "setSleeping"}
                                        ]}
                                ]
                            }),
                            npc2: new Person({
                                isEnemy: true,
                                x: utils.withGrid(7),
                                y: utils.withGrid(4),
                                src: "assets/images/characters/gf_mom.png",
                                returnAfterChase: true,
                                behaviorLoop: [
                                    {type: "stand", direction: "", time: -1},
                                    {type: "walk", direction: "left", time: 5},
                                    {type: "stand", direction: "", time: -1},
                                    {type: "walk", direction: "down", time: 3},
                                    {type: "stand", direction: "", time: -1},
                                    {type: "walk", direction: "right", time: 5},
                                    {type: "walk", direction: "up", time: 3},
                                    {type: "stand", direction: "", time: -1},
                                    {type: "walk", direction: "down", time: 3},
                                    {type: "stand", direction: "", time: -1},
                                    {type: "walk", direction: "right", time: 6},
                                    {type: "stand", direction: "", time: -1},
                                    {type: "walk", direction: "down", time: 2},
                                    {type: "stand", direction: "", time: -1},
                                    {type: "walk", direction: "right", time: 3},
                                    {type: "stand", direction: "", time: -1},
                                    {type: "walk", direction: "down", time: 2},
                                    {type: "stand", direction: "", time: -1},
                                    {type: "addObject", name: "food", inside: new GameObject({
                                            src: "/assets/images/objects/food.png",
                                            x: utils.withGrid(18),
                                            y: utils.withGrid(12),
                                            width: 16,
                                            height: 16
                                        })},
                                    {type: "walk", direction: "up", time: 2},
                                    {type: "stand", direction: "", time: -1},
                                    {type: "walk", direction: "left", time: 3},
                                    {type: "stand", direction: "", time: -1},
                                    {type: "walk", direction: "up", time: 2},
                                    {type: "stand", direction: "", time: -1},
                                    {type: "walk", direction: "left", time: 6},
                                    {type: "stand", direction: "", time: -1},
                                    {type: "walk", direction: "up", time: 3}
                                ]
                            }),
                            keyhole1: new GameObject({
                                x: utils.withGrid(13),
                                y: utils.withGrid(4),
                                src: "assets/images/objects/keyblock.png",
                                width: 32,
                                height: 16,
                                talking: [{
                                    events: [
                                        {type: "removeObject", object: "key", who: "keyhole1", text: "Dang it, I need a key!"}
                                    ]
                                }]
                            }),
                            keyhole2: new GameObject({
                                x: utils.withGrid(12),
                                y: utils.withGrid(4),
                                src: "assets/images/objects/keyblock.png",
                                width: 32,
                                height: 16
                            }),
                            hidingSpot: new Person({
                                x: utils.withGrid(9),
                                y: utils.withGrid(2),
                                src: "assets/images/characters/invisible_guy.png",
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            tv: new GameObject({
                                src: "assets/images/objects/tv.png",
                                x: utils.withGrid(22),
                                y: utils.withGrid(1),
                                width: 46,
                                height: 47
                            }),
                            chair: new GameObject({
                                src: "assets/images/objects/chair.png",
                                x: utils.withGrid(19),
                                y: utils.withGrid(2),
                                width: 40,
                                height: 39
                            }),
                            sofa: new GameObject({
                                src: "assets/images/objects/sofa.png",
                                x: utils.withGrid(21),
                                y: utils.withGrid(5),
                                width: 64,
                                height: 27
                            }),
                            cupboard: new GameObject({
                                src: "assets/images/objects/cupboard.png",
                                x: utils.withGrid(16),
                                y: utils.withGrid(2),
                                width: 29,
                                height: 77,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            table: new GameObject({
                                src: "assets/images/objects/table.png",
                                x: utils.withGrid(18),
                                y: utils.withGrid(11),
                                width: 82,
                                height: 61,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            chairtop: new GameObject({
                                src: "assets/images/objects/chairtop.png",
                                x: utils.withGrid(20),
                                y: utils.withGrid(10),
                                width: 14,
                                height: 18,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            chairbottom: new GameObject({
                                src: "assets/images/objects/chairbottom.png",
                                x: utils.withGrid(20),
                                y: utils.withGrid(15),
                                width: 15,
                                height: 28,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            chairleft: new GameObject({
                                src: "assets/images/objects/chairleft.png",
                                x: utils.withGrid(16),
                                y: utils.withGrid(12),
                                width: 22,
                                height: 35,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            chairright: new GameObject({
                                src: "assets/images/objects/chairright.png",
                                x: utils.withGrid(24),
                                y: utils.withGrid(12),
                                width: 18,
                                height: 35,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            kitchen: new GameObject({
                                src: "assets/images/objects/kitchen.png",
                                x: utils.withGrid(1.5),
                                y: utils.withGrid(1.5),
                                width: 146,
                                height: 127,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            plant: new GameObject({
                                src: "assets/images/objects/plant.png",
                                x: utils.withGrid(9),
                                y: utils.withGrid(10),
                                width: 23,
                                height: 29
                            }),
                            sink: new GameObject({
                                src: "assets/images/objects/sink.png",
                                x: utils.withGrid(4),
                                y: utils.withGrid(12),
                                width: 50,
                                height: 21,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            toilet: new GameObject({
                                src: "assets/images/objects/toilet.png",
                                x: utils.withGrid(9),
                                y: utils.withGrid(15),
                                width: 20,
                                height: 25
                            }),
                            bathtub: new GameObject({
                                src: "assets/images/objects/bathtub.png",
                                x: utils.withGrid(2),
                                y: utils.withGrid(13),
                                width: 25,
                                height: 62
                            })
                        },
                        walls: window.wallGeneration(
                            window.wallGeneration(
                                window.wallGeneration(
                                    window.wallGeneration(
                                        window.wallGeneration(
                                            window.wallGeneration(
                                                window.wallGeneration(
                                                    window.wallGeneration(
                                                        window.wallGeneration(
                                                            window.wallGeneration(
                                                                window.wallGeneration(
                                                                    window.wallGeneration({},
                                                                        1, 0, 24, 18),
                                                                    10, 0, 1, 5),
                                                                10, 8, 1, 3),
                                                            10, 14, 1, 3),
                                                        14, 0, 1, 7),
                                                    14, 10, 1, 7),
                                                1, 11, 7, 0),
                                            2, 17, 7, 0),
                                        2, 2, 7, 0),
                                    16, 1, 8, 0),
                                16, 3, 0, 3),
                            18, 12, 4, 1),
                        cutsceneSpaces: {
                            [utils.asGridCoord(12, 2)]: [{
                                events: [
                                    {type: "changeMap", map: "GFSecondFloor"}
                                ]
                            }],
                            [utils.asGridCoord(13, 2)]: [{
                                events: [
                                    {type: "changeMap", map: "GFSecondFloor"}
                                ]
                            }]
                        },
                        entryCutscene: [
                            {type: "textMessage", text: "Things changed.."},
                            {type: "textMessage", text: "I should do something."}
                        ]
                    };

                case 3:
                    return {
                        id: "GFFirstFloor",
                        lowerSrc: "assets/images/backgrounds/gf_first_floor.png",
                        upperSrc: "",
                        music: "Calm",
                        gameObjects: {
                            hero: new Person({
                                isPlayerControlled: true,
                                x: utils.withGrid(18),
                                y: utils.withGrid(3)
                            }),
                            npc1: new Person({
                                isEnemy: true,
                                x: utils.withGrid(21),
                                y: utils.withGrid(8),
                                src: "assets/images/characters/gf_dad.png",
                                behaviorLoop: [
                                    {type: "walk", direction: "random", time: -1}
                                ]
                            }),
                            npc2: new Person({
                                isEnemy: true,
                                x: utils.withGrid(7),
                                y: utils.withGrid(4),
                                src: "assets/images/characters/gf_mom.png",
                                returnAfterChase: true,
                                behaviorLoop: [
                                    {type: "walk", direction: "random", time: -1}
                                ]
                            }),
                            hidingSpot: new Person({
                                x: utils.withGrid(9),
                                y: utils.withGrid(2),
                                src: "assets/images/characters/invisible_guy.png",
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            tv: new GameObject({
                                src: "assets/images/objects/tv.png",
                                x: utils.withGrid(22),
                                y: utils.withGrid(1),
                                width: 46,
                                height: 47
                            }),
                            chair: new GameObject({
                                src: "assets/images/objects/chair.png",
                                x: utils.withGrid(19),
                                y: utils.withGrid(2),
                                width: 40,
                                height: 39
                            }),
                            sofa: new GameObject({
                                src: "assets/images/objects/sofa.png",
                                x: utils.withGrid(21),
                                y: utils.withGrid(5),
                                width: 64,
                                height: 27
                            }),
                            cupboard: new GameObject({
                                src: "assets/images/objects/cupboard.png",
                                x: utils.withGrid(16),
                                y: utils.withGrid(2),
                                width: 29,
                                height: 77,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            table: new GameObject({
                                src: "assets/images/objects/table.png",
                                x: utils.withGrid(18),
                                y: utils.withGrid(11),
                                width: 82,
                                height: 61,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            chairtop: new GameObject({
                                src: "assets/images/objects/chairtop.png",
                                x: utils.withGrid(20),
                                y: utils.withGrid(10),
                                width: 14,
                                height: 18,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            chairbottom: new GameObject({
                                src: "assets/images/objects/chairbottom.png",
                                x: utils.withGrid(20),
                                y: utils.withGrid(15),
                                width: 15,
                                height: 28,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            chairleft: new GameObject({
                                src: "assets/images/objects/chairleft.png",
                                x: utils.withGrid(16),
                                y: utils.withGrid(12),
                                width: 22,
                                height: 35,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            chairright: new GameObject({
                                src: "assets/images/objects/chairright.png",
                                x: utils.withGrid(24),
                                y: utils.withGrid(12),
                                width: 18,
                                height: 35,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            kitchen: new GameObject({
                                src: "assets/images/objects/kitchen.png",
                                x: utils.withGrid(1.5),
                                y: utils.withGrid(1.5),
                                width: 146,
                                height: 127,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            plant: new GameObject({
                                src: "assets/images/objects/plant.png",
                                x: utils.withGrid(9),
                                y: utils.withGrid(10),
                                width: 23,
                                height: 29
                            }),
                            sink: new GameObject({
                                src: "assets/images/objects/sink.png",
                                x: utils.withGrid(4),
                                y: utils.withGrid(12),
                                width: 50,
                                height: 21,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            toilet: new GameObject({
                                src: "assets/images/objects/toilet.png",
                                x: utils.withGrid(9),
                                y: utils.withGrid(15),
                                width: 20,
                                height: 25
                            }),
                            bathtub: new GameObject({
                                src: "assets/images/objects/bathtub.png",
                                x: utils.withGrid(2),
                                y: utils.withGrid(13),
                                width: 25,
                                height: 62
                            })
                        },
                        walls: window.wallGeneration(
                            window.wallGeneration(
                                window.wallGeneration(
                                    window.wallGeneration(
                                        window.wallGeneration(
                                            window.wallGeneration(
                                                window.wallGeneration(
                                                    window.wallGeneration(
                                                        window.wallGeneration(
                                                            window.wallGeneration(
                                                                window.wallGeneration(
                                                                    window.wallGeneration({},
                                                                        1, 0, 24, 18),
                                                                    10, 0, 1, 5),
                                                                10, 8, 1, 3),
                                                            10, 14, 1, 3),
                                                        14, 0, 1, 7),
                                                    14, 10, 1, 7),
                                                1, 11, 7, 0),
                                            2, 17, 7, 0),
                                        2, 2, 7, 0),
                                    16, 1, 8, 0),
                                16, 3, 0, 3),
                            18, 12, 4, 1),
                        cutsceneSpaces: {
                            [utils.asGridCoord(12, 2)]: [{
                                events: [
                                    {type: "changeMap", map: "GFSecondFloor"}
                                ]
                            }],
                            [utils.asGridCoord(13, 2)]: [{
                                events: [
                                    {type: "changeMap", map: "GFSecondFloor"}
                                ]
                            }]
                        },
                        entryCutscene: [
                            {type: "textMessage", text: "I have to be careful."},
                            {type: "textMessage", text: "I can hide in some spots if needed."}
                        ]
                    };

                case 4:
                    return {
                        id: "GFFirstFloor",
                        lowerSrc: "assets/images/backgrounds/gf_first_floor.png",
                        upperSrc: "assets/images/backgrounds/darkest.png",
                        music: "Calm",
                        gameObjects: {
                            hero: new Person({
                                isPlayerControlled: true,
                                x: utils.withGrid(12),
                                y: utils.withGrid(16)
                            }),
                            hidingSpot: new Person({
                                x: utils.withGrid(9),
                                y: utils.withGrid(2),
                                src: "assets/images/characters/invisible_guy.png",
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            tv: new GameObject({
                                src: "assets/images/objects/tv.png",
                                x: utils.withGrid(22),
                                y: utils.withGrid(1),
                                width: 46,
                                height: 47
                            }),
                            chair: new GameObject({
                                src: "assets/images/objects/chair.png",
                                x: utils.withGrid(19),
                                y: utils.withGrid(2),
                                width: 40,
                                height: 39
                            }),
                            sofa: new GameObject({
                                src: "assets/images/objects/sofa.png",
                                x: utils.withGrid(21),
                                y: utils.withGrid(5),
                                width: 64,
                                height: 27
                            }),
                            cupboard: new GameObject({
                                src: "assets/images/objects/cupboard.png",
                                x: utils.withGrid(16),
                                y: utils.withGrid(2),
                                width: 29,
                                height: 77,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            table: new GameObject({
                                src: "assets/images/objects/table.png",
                                x: utils.withGrid(18),
                                y: utils.withGrid(11),
                                width: 82,
                                height: 61,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            chairtop: new GameObject({
                                src: "assets/images/objects/chairtop.png",
                                x: utils.withGrid(20),
                                y: utils.withGrid(10),
                                width: 14,
                                height: 18,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            chairbottom: new GameObject({
                                src: "assets/images/objects/chairbottom.png",
                                x: utils.withGrid(20),
                                y: utils.withGrid(15),
                                width: 15,
                                height: 28,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            chairleft: new GameObject({
                                src: "assets/images/objects/chairleft.png",
                                x: utils.withGrid(16),
                                y: utils.withGrid(12),
                                width: 22,
                                height: 35,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            chairright: new GameObject({
                                src: "assets/images/objects/chairright.png",
                                x: utils.withGrid(24),
                                y: utils.withGrid(12),
                                width: 18,
                                height: 35,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            kitchen: new GameObject({
                                src: "assets/images/objects/kitchen.png",
                                x: utils.withGrid(1.5),
                                y: utils.withGrid(1.5),
                                width: 146,
                                height: 127,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            plant: new GameObject({
                                src: "assets/images/objects/plant.png",
                                x: utils.withGrid(9),
                                y: utils.withGrid(10),
                                width: 23,
                                height: 29
                            }),
                            sink: new GameObject({
                                src: "assets/images/objects/sink.png",
                                x: utils.withGrid(4),
                                y: utils.withGrid(12),
                                width: 50,
                                height: 21,
                                talking: [{
                                    events: [
                                        {who: "hero", type: "hidingToggle"}
                                    ]
                                }]
                            }),
                            toilet: new GameObject({
                                src: "assets/images/objects/toilet.png",
                                x: utils.withGrid(9),
                                y: utils.withGrid(15),
                                width: 20,
                                height: 25
                            }),
                            bathtub: new GameObject({
                                src: "assets/images/objects/bathtub.png",
                                x: utils.withGrid(2),
                                y: utils.withGrid(13),
                                width: 25,
                                height: 62
                            })
                        },
                        walls: window.wallGeneration(
                            window.wallGeneration(
                                window.wallGeneration(
                                    window.wallGeneration(
                                        window.wallGeneration(
                                            window.wallGeneration(
                                                window.wallGeneration(
                                                    window.wallGeneration(
                                                        window.wallGeneration(
                                                            window.wallGeneration(
                                                                window.wallGeneration(
                                                                    window.wallGeneration({},
                                                                        1, 0, 24, 18),
                                                                    10, 0, 1, 5),
                                                                10, 8, 1, 3),
                                                            10, 14, 1, 3),
                                                        14, 0, 1, 7),
                                                    14, 10, 1, 7),
                                                1, 11, 7, 0),
                                            2, 17, 7, 0),
                                        2, 2, 7, 0),
                                    16, 1, 8, 0),
                                16, 3, 0, 3),
                            18, 12, 4, 1),
                        cutsceneSpaces: {
                            [utils.asGridCoord(12, 2)]: [{
                                events: [
                                    {type: "changeMap", map: "GFSecondFloor"}
                                ]
                            }],
                            [utils.asGridCoord(13, 2)]: [{
                                events: [
                                    {type: "changeMap", map: "GFSecondFloor"}
                                ]
                            }]
                        },
                        entryCutscene: [
                            {type: "textMessage", text: "Where's everyone?"},
                        ]
                    };
            }
            break;


        case "GFSecondFloor":
            switch (index) {
                case 0:
                    return {
                        id: "GFSecondFloor",
                        lowerSrc: "assets/images/backgrounds/gf_second_floor.png",
                        upperSrc: "",
                        music: "Calm",
                        gameObjects: {
                            hero: new Person({
                                isPlayerControlled: true,
                                x: utils.withGrid(10),
                                y: utils.withGrid(6),
                            })
                        },
                        walls: window.wallGeneration(
                            window.wallGeneration(
                                window.wallGeneration({},
                                    -1, 3, 21, 12),
                                12, 7, 7, 7),
                            0, 7, 8, 7),
                        cutsceneSpaces: {
                            [utils.asGridCoord(16,  4)]: [{
                                events: [
                                    {type: "changeMap", map: "VNPartGFHouse"}
                                ]
                            }],
                            [utils.asGridCoord(17,  4)]: [{
                                events: [
                                    {type: "changeMap", map: "VNPartGFHouse"}
                                ]
                            }]
                        }
                    };

                case 1:
                    return {
                        id: "GFSecondFloor",
                        lowerSrc: "assets/images/backgrounds/gf_second_floor.png",
                        upperSrc: "",
                        music: "Calm",
                        gameObjects: {
                            hero: new Person({
                                isPlayerControlled: true,
                                x: utils.withGrid(10),
                                y: utils.withGrid(6),
                            })
                        },
                        walls: window.wallGeneration(
                            window.wallGeneration(
                                window.wallGeneration({},
                                    -1, 3, 21, 12),
                                12, 7, 7, 7),
                            0, 7, 8, 7),
                        cutsceneSpaces: {
                            [utils.asGridCoord(16,  4)]: [{
                                events: [
                                    {type: "changeMap", map: "VNPartGFHouse"}
                                ]
                            }],
                            [utils.asGridCoord(17,  4)]: [{
                                events: [
                                    {type: "changeMap", map: "VNPartGFHouse"}
                                ]
                            }]
                        }
                    };

                case 2:
                    return {
                        id: "GFSecondFloor",
                        lowerSrc: "assets/images/backgrounds/gf_second_floor.png",
                        upperSrc: "",
                        music: "Calm",
                        gameObjects: {
                            hero: new Person({
                                isPlayerControlled: true,
                                x: utils.withGrid(10),
                                y: utils.withGrid(6),
                            })
                        },
                        walls: window.wallGeneration(
                            window.wallGeneration(
                                window.wallGeneration({},
                                    -1, 3, 21, 12),
                                12, 7, 7, 7),
                            0, 7, 8, 7),
                        cutsceneSpaces: {
                            [utils.asGridCoord(16,  4)]: [{
                                events: [
                                    {type: "changeMap", map: "VNPartGFHouse"}
                                ]
                            }],
                            [utils.asGridCoord(17,  4)]: [{
                                events: [
                                    {type: "changeMap", map: "VNPartGFHouse"}
                                ]
                            }]
                        }
                    };

                case 3:
                    return {
                        id: "GFSecondFloor",
                        lowerSrc: "assets/images/backgrounds/gf_second_floor.png",
                        upperSrc: "",
                        music: "Calm",
                        gameObjects: {
                            hero: new Person({
                                isPlayerControlled: true,
                                x: utils.withGrid(10),
                                y: utils.withGrid(6),
                            })
                        },
                        walls: window.wallGeneration(
                            window.wallGeneration(
                                window.wallGeneration({},
                                    -1, 3, 21, 12),
                                12, 7, 7, 7),
                            0, 7, 8, 7),
                        cutsceneSpaces: {
                            [utils.asGridCoord(16,  4)]: [{
                                events: [
                                    {type: "changeMap", map: "VNPartGFHouse"}
                                ]
                            }],
                            [utils.asGridCoord(17,  4)]: [{
                                events: [
                                    {type: "changeMap", map: "VNPartGFHouse"}
                                ]
                            }]
                        }
                    };

                case 4:
                    return {
                        id: "GFSecondFloor",
                        lowerSrc: "assets/images/backgrounds/gf_second_floor.png",
                        upperSrc: "assets/images/backgrounds/darkest.png",
                        music: "Calm",
                        gameObjects: {
                            hero: new Person({
                                isPlayerControlled: true,
                                x: utils.withGrid(10),
                                y: utils.withGrid(6),
                            })
                        },
                        walls: window.wallGeneration(
                            window.wallGeneration(
                                window.wallGeneration({},
                                    -1, 3, 21, 12),
                                12, 7, 7, 7),
                            0, 7, 8, 7),
                        cutsceneSpaces: {
                            [utils.asGridCoord(16,  4)]: [{
                                events: [
                                    {type: "changeMap", map: "VNPartGFHouse"}
                                ]
                            }],
                            [utils.asGridCoord(17,  4)]: [{
                                events: [
                                    {type: "changeMap", map: "VNPartGFHouse"}
                                ]
                            }]
                        }
                    };
            }
            break;


        case "VNPartGFHouse":
            switch (index) {
                case 0:
                    return {
                        id: "VNPartGFHouse",
                        lowerSrc: "assets/images/backgrounds/gf_bedroom.png",
                        upperSrc: "",
                        music: "VNStartGF",
                        gameObjects: {
                            hero: new Person({
                                isPlayerControlled: true,
                                isHidden: true,
                                x: utils.withGrid(10),
                                y: utils.withGrid(7.5)
                            })
                        },
                        VNCharacters: {
                            gf : new VNCharacter({
                                src: "shocked"
                            })
                        },
                        entryCutscene: [
                            {type: "textMessage", text: "How did you get here?"},
                            {type: "imageChangeSrc", src: "empty"},
                            {type: "textMessage", text: "Secret :3"},
                            {type: "textMessage", text: "Are you not glad?.."},
                            {type: "imageChangeSrc", src: "serious"},
                            {type: "textMessage", text: "No-no, you just took me by surprise."},
                            {type: "imageChangeSrc", src: "empty"},
                            {type: "textMessage", text: "Phew, I was worried you now hate me :("},
                            {type: "imageChangeSrc", src: "mocking"},
                            {type: "textMessage", text: "You know I don't hate you, c'mon."},
                            {type: "imageChangeSrc", src: "serious"},
                            {type: "textMessage", text: "Just don't want parents to.."},
                            {type: "imageChangeSrc", src: "empty"},
                            {type: "textMessage", text: "Catch us, yeah, blah-blah."},
                            {type: "textMessage", text: "They are busy, I checked."},
                            {type: "textMessage", text: "If needed, I can hide."},
                            {type: "textMessage", text: "Or jump out the window."},
                            {type: "textMessage", text: "Or fight them."},
                            {type: "imageChangeSrc", src: "happy"},
                            {type: "textMessage", text: "I doubt that's necessary."},
                            {type: "imageChangeSrc", src: "empty"},
                            {type: "textMessage", text: "Who knows."},
                            {type: "imageChangeSrc", src: "happy"},
                            {type: "textMessage", text: "I'm so glad to see you."},
                            {type: "levelChange"},
                            {type: "changeMap", map: "VNPartMCHouse"}
                        ]
                    };

                case 1:
                    return {
                        id: "VNPartGFHouse",
                        lowerSrc: "assets/images/backgrounds/gf_bedroom.png",
                        upperSrc: "",
                        music: "VNStartGF",
                        gameObjects: {
                            hero: new Person({
                                isPlayerControlled: true,
                                isHidden: true,
                                x: utils.withGrid(10),
                                y: utils.withGrid(7.5)
                            })
                        },
                        VNCharacters: {
                            gf : new VNCharacter({
                                src: "neutral"
                            })
                        },
                        entryCutscene: [
                            {type: "textMessage", text: "You are here again!"},
                            {type: "imageChangeSrc", src: "empty"},
                            {type: "textMessage", text: "Of course I am!"},
                            {type: "imageChangeSrc", src: "happy"},
                            {type: "textMessage", text: "I'm glad that you want to stick around."},
                            {type: "imageChangeSrc", src: "empty"},
                            {type: "textMessage", text: "Woah, it's ME who should be glad!!"},
                            {type: "imageChangeSrc", src: "mocking"},
                            {type: "textMessage", text: "Well, it's also YOU who has to get past my parents all the time.."},
                            {type: "imageChangeSrc", src: "empty"},
                            {type: "textMessage", text: "Yeah..Today they were quite a bother."},
                            {type: "textMessage", text: "Nothing is too hard for me though!"},
                            {type: "imageChangeSrc", src: "neutral"},
                            {type: "textMessage", text: "I'm glad to hear that!"},
                            {type: "imageChangeSrc", src: "sad"},
                            {type: "textMessage", text: "I can't stop thinking though.."},
                            {type: "textMessage", text: "I have a feeling that one day things will go wrong."},
                            {type: "imageChangeSrc", src: "empty"},
                            {type: "textMessage", text: "I'm sure everything will be alright!"},
                            {type: "imageChangeSrc", src: "serious"},
                            {type: "textMessage", text: "It's a fact."},
                            {type: "imageChangeSrc", src: "serious_closed"},
                            {type: "textMessage", text: "One day, things will go wrong, and there's nothing we can do."},
                            {type: "levelChange"},
                            {type: "changeMap", map: "VNPartMCHouse"}
                        ]
                    };

                case 2:
                    return {
                        id: "VNPartGFHouse",
                        lowerSrc: "assets/images/backgrounds/gf_bedroom.png",
                        upperSrc: "",
                        music: "VNStartGF",
                        gameObjects: {
                            hero: new Person({
                                isPlayerControlled: true,
                                isHidden: true,
                                x: utils.withGrid(10),
                                y: utils.withGrid(7.5)
                            })
                        },
                        VNCharacters: {
                            gf : new VNCharacter({
                                src: "neutral"
                            })
                        },
                        entryCutscene: [
                            {type: "imageChangeSrc", src: "empty"},
                            {type: "textMessage", text: "Your parents were quite in the way today.."},
                            {type: "imageChangeSrc", src: "serious"},
                            {type: "textMessage", text: "I'm worried.. I think they are suspecting something."},
                            {type: "imageChangeSrc", src: "empty"},
                            {type: "textMessage", text: "Hey, it'll be alright!"},
                            {type: "imageChangeSrc", src: "sad_closed"},
                            {type: "textMessage", text: "You don't know what you're talking about.."},
                            {type: "imageChangeSrc", src: "empty"},
                            {type: "textMessage", text: "We'll get away with it, like usual."},
                            {type: "imageChangeSrc", src: "sad"},
                            {type: "textMessage", text: "Stop it!"},
                            {type: "textMessage", text: "You don't know what you are saying."},
                            {type: "imageChangeSrc", src: "sad_closed"},
                            {type: "textMessage", text: "I don't want to talk today anymore.."},
                            {type: "levelChange"},
                            {type: "changeMap", map: "VNPartMCHouse"}
                        ]
                    };

                case 3:
                    return {
                        id: "VNPartGFHouse",
                        lowerSrc: "assets/images/backgrounds/gf_bedroom.png",
                        upperSrc: "",
                        music: "VNStartGF",
                        gameObjects: {
                            hero: new Person({
                                isPlayerControlled: true,
                                isHidden: true,
                                x: utils.withGrid(10),
                                y: utils.withGrid(7.5)
                            })
                        },
                        VNCharacters: {
                            gf : new VNCharacter({
                                src: "neutral"
                            })
                        },
                        entryCutscene: [
                            {type: "imageChangeSrc", src: "empty"},
                            {type: "textMessage", text: "What's with your parents?"},
                            {type: "textMessage", text: "They are lowkey going crazy down there."},
                            {type: "imageChangeSrc", src: "serious"},
                            {type: "textMessage", text: "You shouldn't have come."},
                            {type: "textMessage", text: "Hide."},
                            {type: "imageChangeSrc", src: "empty"},
                            {type: "textMessage", text: "But-"},
                            {type: "imageChangeSrc", src: "serious"},
                            {type: "textMessage", text: "Now."},
                            {type: "changeMap", map: "InCloset"}
                        ]
                    };

                case 4:
                    return {
                        id: "VNPartGFHouse",
                        lowerSrc: "assets/images/backgrounds/gf_bedroom.png",
                        upperSrc: "assets/images/backgrounds/dark.png",
                        music: "VNEnd",
                        gameObjects: {
                            hero: new Person({
                                isPlayerControlled: true,
                                isHidden: true,
                                x: utils.withGrid(10),
                                y: utils.withGrid(7.5)
                            })
                        },
                        VNCharacters: {
                            gf : new VNCharacter({
                                src: "neutral"
                            })
                        },
                        entryCutscene: [
                            {type: "imageChangeSrc", src: "empty"},
                            {type: "textMessage", text: "My dear?.."},
                            {type: "textMessage", text: "Where are you, darling?.."},
                            {type: "textMessage", text: "Darling?.."},
                            {type: "textMessage", text: ".."},
                            {type: "textMessage", text: "..."},
                            {type: "textMessage", text: "It seems no one is here."},
                            {type: "playScare", src: "scare3"},
                            {type: "imageChangeSrc", src: "screamer"},
                            {type: "imageChangeSrc", src: "screamer"},
                            {type: "imageChangeSrc", src: "screamer"},
                            {type: "imageChangeSrc", src: "screamer"},
                            {type: "imageChangeSrc", src: "screamer"},
                            {type: "changeMap", map: "TheEnd"}
                        ]
                    };
            }
            break;


        case "InCloset":
            switch(index) {
                case 3:
                    return {
                        id: "InCloset",
                        lowerSrc: "assets/images/backgrounds/gf_bedroom_closet.png",
                        upperSrc: "assets/images/backgrounds/gf_bedroom_closet_upper.png",
                        music: "VNStartGF",
                        gameObjects: {
                            hero: new Person({
                                isPlayerControlled: true,
                                isHidden: true,
                                x: utils.withGrid(10),
                                y: utils.withGrid(7.5)
                            })
                        },
                        VNCharacters: {
                            gf : new VNCharacter({
                                src: "gf_dad"
                            })
                        },
                        entryCutscene: [
                            {type: "textMessage", text: "Who are you talking to."},
                            {type: "textMessage", text: "No one..."},
                            {type: "textMessage", text: "Who. are. you. talking. to."},
                            {type: "textMessage", text: "I swear, no one! It just gets lonely here."},
                            {type: "textMessage", text: "I won't tolerate disobedience. You better not be lying now."},
                            {type: "textMessage", text: "I am not lying."},
                            {type: "imageChangeSrc", src: "empty"},
                            {type: "textMessage", text: "You'll regret it."},
                            {type: "playScare", src: "scare2"},
                            {type: "imageChangeSrc", src: "gf_dad_creepy"},
                            {type: "imageChangeSrc", src: "gf_dad_creepy"},
                            {type: "changeMap", map: "OutOfCloset"}
                        ]
                    };

            }
            break;

        case "OutOfCloset":
            switch(index) {
                case 3:
                    return {
                        id: "OutOfCloset",
                        lowerSrc: "assets/images/backgrounds/gf_bedroom.png",
                        upperSrc: "",
                        music: "VNStartGF",
                        gameObjects: {
                            hero: new Person({
                                isPlayerControlled: true,
                                isHidden: true,
                                x: utils.withGrid(10),
                                y: utils.withGrid(7.5)
                            })
                        },
                        VNCharacters: {
                            gf : new VNCharacter({
                                src: "serious"
                            })
                        },
                        entryCutscene: [
                            {type: "textMessage", text: "You have to go."},
                            {type: "imageChangeSrc", src: "empty"},
                            {type: "textMessage", text: "He didn't do anything though!"},
                            {type: "imageChangeSrc", src: "serious_closed"},
                            {type: "textMessage", text: "Go, and never come back. I'm serious."},
                            {type: "levelChange"},
                            {type: "changeMap", map: "VNPartMCHouse"}
                        ]
                    };

            }
            break;


        case "TheEnd":
            switch(index) {
                case 4:
                    return {
                            id: "TheEnd",
                            lowerSrc: "assets/images/UI/theend.png",
                            upperSrc: "",
                            music: "VNEnd",
                            gameObjects: {
                                hero: new Person({
                                    isPlayerControlled: true,
                                    isHidden: true,
                                    x: utils.withGrid(9),
                                    y: utils.withGrid(6.5)
                                })
                            },
                    };
            }
            break;


    }

}



