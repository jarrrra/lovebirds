class Overworld {
    constructor(config) {
        this.element = config.element;
        this.canvas = this.element.querySelector(".game-canvas");
        this.ctx = this.canvas.getContext("2d");
        this.map = null;
        this.inventory = null;
        this.progress = null;
        this.cameraX = true;
        this.cameraY = true;
        this.camera = {x: 144, y: 104};

        this.lines = new Image();
        this.lines.src = "/assets/images/backgrounds/lines.png";

        this.music = new Audio();
        this.music.loop = true;

        this.scare = new Audio();
    }

    musicChangeSrc(src) {
        this.music.src = "/assets/sounds/music/" + src + ".mp3";
        this.music.play();
    }

    scareChangeSrc(src) {
        this.scare.src = "assets/sounds/sfx/" + src + ".mp3";
        this.scare.play();
    }

    gameLoopStepWork() {
        //Cleanup
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        //Camera setup
        const cameraPerson = this.map.gameObjects.hero;
        this.cameraX = !(cameraPerson.x - 144 < 0 || cameraPerson.x + 176 > this.map.lowerImage.width);
        this.cameraY = !(cameraPerson.y - 104 < 0 || cameraPerson.y + 136 > this.map.lowerImage.height);


        if (this.cameraX) {
            this.camera.x = cameraPerson.x;
        }

        if (this.cameraY) {
            this.camera.y = cameraPerson.y;
        }

        //Enemy check & objects update
        Object.values(this.map.gameObjects).forEach(object => {
            object.update({
                arrow: this.directionInput.direction,
                map: this.map
            });
        });

        //Background
        this.map.drawLowerImage(this.ctx, this.camera);

        //Game objects
        Object.values(this.map.gameObjects).sort((a, b) => {
            if (a.item) {
                return b.y - a.y;
            }

            return a.y - b.y;
        }).forEach(object => {
            if (!object.isHidden) {
                object.sprite.draw(this.ctx, this.camera);
            }
        });

        Object.values(this.map.VNCharacters).forEach(object => {
            object.draw(this.ctx);
        });

        //Foreground
        if (this.map.upperSrc !== "") {
            this.map.drawUpperImage(this.ctx, this.camera);
        }

        if (this.inventory !== null) {
            this.inventory.drawInventory(this.ctx, cameraPerson, this.camera);
        }

        this.ctx.drawImage(this.lines, 0, 0);


    }

    startGameLoop() {
        let previousMs;
        const step = 1/60;

        const stepFn = (timestampMs) => {

            if (previousMs === undefined) {
                previousMs = timestampMs;
            }
            let delta = (timestampMs - previousMs) / 1000;
            while (delta >= step) {
                this.gameLoopStepWork();
                delta -= step;
            }

            previousMs = timestampMs - delta * 1000;

            requestAnimationFrame(stepFn);
        };
        requestAnimationFrame(stepFn);
    }

    bindActionInput() {
        document.addEventListener("keypress", e => {
            if (e.code === "KeyZ") {
                this.map.checkForActionCutscene();
            }
        });
    }

    bindHeroPositionCheck() {
        document.addEventListener("PersonWalkingComplete", e => {
            if (e.detail.whoId === "hero" || this.map.isMessageShowing) {
                this.map.checkForFootstepCutscene();
                this.map.checkForActionCutsceneInstructions();
            }
        })
    }

    startMap(mapConfig, mapLevel = 0) {
        console.log(this.progress.mapId, mapLevel);

        this.inventory = null;
        this.map = new OverworldMap(window.OverworldMaps(mapConfig, mapLevel));
        this.map.overworld = this;
        this.map.mountObjects();

        if (this.music.src.indexOf(this.progress.musicSrc) === -1) {
            this.musicChangeSrc(this.progress.musicSrc);
        }

        this.camera = {x: 144, y: 104};

        if (this.map.id === "GFFirstFloor") {

            if (this.map.gameObjects.hero.x >= 160) {
                this.camera.x = 242;
            }

            if (this.map.gameObjects.hero.y >= 120) {
                this.camera.y = 166;
            }

        }

        console.log(this.camera);

        this.progress.mapId = this.map.id;
        this.progress.mapLevel = mapLevel;
        this.progress.save();

        if (this.map.entryCutscene.length && this.map.haveCutscene && !this.map.isCutscenePlaying) {
            this.map.haveCutscene = false;
            this.map.startCutscene(this.map.entryCutscene);
        }
    }

    async init() {
        this.progress = new Progress();

        window.titleScreen = new TitleScreen({
            progress: this.progress
        })
        const useSaveFile = await window.titleScreen.init(document.querySelector(".game-container"));

        if (useSaveFile) {
            this.progress.load();
        }

        this.startMap(this.progress.mapId, this.progress.mapLevel);

        this.bindActionInput();
        this.bindHeroPositionCheck();

        this.directionInput = new DirectionInput();
        this.directionInput.init();

        this.startGameLoop();

        // this.map.startCutscene([
        //     {type: "textMessage", text: "This message is crucial to the testing of the typewriter effect"},
        //     {type: "textMessage", text: "Bye!"},
        //     {type: "changeMap", map: "DemoRoom1"}
        // ]);
    }
}