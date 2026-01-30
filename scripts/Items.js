class Items extends GameObject {
    constructor(config) {
        super(config);
        this.item = true;
    }

    mount(map) {
        this.isMounted = true;

        setTimeout(() => {
            this.doBehaviourEvent(map);
        }, 10);
    }

    pickedUp(map, onComplete) {
        map.overworld.inventory = this;
        delete map.gameObjects[this.id];
        onComplete();
    }

    drawInventory(ctx, follow, cameraPerson) {
        const x = follow.x + 2 + utils.withGrid(9) - cameraPerson.x;
        const y = follow.y + 5 + utils.withGrid(6.5) - cameraPerson.y;

        this.sprite.isLoaded && ctx.drawImage(
            this.sprite.image,
            0, 0, //crop start
            32, 32, //crop size
            x, y, //map pos
            32, 32
        )
    }
}