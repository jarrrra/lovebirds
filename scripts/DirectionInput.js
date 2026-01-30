class DirectionInput {
    constructor() {
        this.map = {
            "ArrowUp" : "up",
            "ArrowDown" : "down",
            "ArrowLeft" : "left",
            "ArrowRight" : "right",

            "KeyW" : "up",
            "KeyS" : "down",
            "KeyA" : "left",
            "KeyD" : "right",
        }
    }

    get direction() {
        return window.heldDirections[0];
    }

    init() {
        document.addEventListener("keydown", e => {
            const dir = this.map[e.code];
            if (dir && window.heldDirections.indexOf(dir) === -1) {
                window.heldDirections.unshift(dir);
            }
        });

        document.addEventListener("keyup", e => {
            const dir = this.map[e.code];
            const index = window.heldDirections.indexOf(dir);
            if (index > -1) {
                window.heldDirections.splice(index, 1);
            }
        })
    }
}

window.heldDirections = [];

window.keyPressed = function (dir) {
    if (dir && window.heldDirections.indexOf(dir) === -1) {
        window.heldDirections.unshift(dir);
    }
}

window.keyLifted = function (dir) {
    const index = window.heldDirections.indexOf(dir);
    if (index > -1) {
        window.heldDirections.splice(index, 1);
    }
    window.hovered(false, dir);
}

window.interactPressed = function () {
    console.log("press");
    document.dispatchEvent(new KeyboardEvent('keypress', {'code': 'KeyZ'}));
}