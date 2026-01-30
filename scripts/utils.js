const utils = {
    withGrid(n) {
        return n * 16;
    },
    asGridCoord(x,y) {
        return `${x*16},${y*16}`;
    },
    nextPosition(initialX, initialY, direction, multiplier) {
        let x = initialX;
        let y = initialY;
        let size = 16 * multiplier;
        switch (direction) {
            case "up":
                y -= size;
                break;

            case "down":
                y += size;
                break;

            case "left":
                x -= size;
                break;

            case "right":
                x += size;
                break;
        }

        return {x,y};
    },
    emitEvent(name, detail) {
        const event = new CustomEvent(name, {
            detail
        });
        document.dispatchEvent(event);
    }
}