class SceneTransition {
    constructor() {
        this.element = null;

        this.transition =  new Audio("assets/sounds/sfx/scary_transition.mp3");
    }

    createElement() {
        this.element = document.createElement("div");
        this.element.classList.add("SceneTransition");

        this.transition.play();
    }

    fadeOut() {
        this.element.classList.add("fade-out");
        this.element.addEventListener("animationend", () => {
            this.element.remove();
        }, { once: true });
    }

    init(container, callback) {
        this.createElement();
        container.appendChild(this.element);

        this.element.addEventListener("animationend", () => {
            callback();
        }, { once: true });
    }
}