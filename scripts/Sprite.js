class Sprite {
    constructor(config) {

        //Image set up
        this.image = new Image();
        this.image.src = config.src;
        this.image.onload = () => {
            this.isLoaded = true;
        };
        this.width = config.width || 32;
        this.height = config.height || 32;

        //Animations config

        this.animations = config.animations || {
            "idle-left": [
                [0, 0], [1, 0], [2, 0], [3, 0]
            ],
            "idle-right": [
                [0, 1], [1, 1], [2, 1], [3, 1]
            ],
            "walk-left": [
                [4, 0], [5, 0]
            ],
            "walk-right": [
                [4, 1], [5, 1]
            ],
            "asleep": [
                [6, 0], [6, 1]
            ]
        };

        this.currentAnimation = config.currentAnimation || "idle-left";
        this.currentAnimationFrame = 0;

        this.animationFrameLimit = config.animationFrameLimit || 10;
        this.animationFrameProgress = this.animationFrameLimit;

        //Game object ref
        this.gameObject = config.gameObject;
    }

    get frame() {
        return this.animations[this.currentAnimation][this.currentAnimationFrame];
    }

    setAnimation(key) {
        if (this.currentAnimation !== key) {
            this.currentAnimation = key;
            this.currentAnimationFrame = 0;
            this.animationFrameProgress = this.animationFrameLimit;
        }
    }

    updateAnimationProgress() {
        if (this.animationFrameProgress > 0) {
            this.animationFrameProgress -= 1;
            return;
        }

        this.animationFrameProgress = this.animationFrameLimit;
        this.currentAnimationFrame += 1;

        if (this.frame === undefined) {
            this.currentAnimationFrame = 0;
        }
    }

    draw(ctx, cameraPerson) {
        const x = this.gameObject.x - 5 + utils.withGrid(9) - cameraPerson.x;
        const y = this.gameObject.y - 10 + utils.withGrid(6.5) - cameraPerson.y;

        const [frameX, frameY] = this.frame;

        this.isLoaded && ctx.drawImage(
            this.image,
            frameX * this.width, frameY * this.height, //crop start
            this.width, this.height, //crop size
            x, y, //map pos
            this.width, this.height
        )

        this.updateAnimationProgress();
    }
}