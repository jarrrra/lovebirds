class TitleScreen {
    constructor({ progress }) {
        this.progress = progress;
        this.onComplete = null;
        this.saveFile = null;
    }

    createElement() {
        this.element = document.createElement("div");
        this.element.classList.add("TitleScreen");

        this.saveFile = this.progress.getSaveFile();

        if (this.saveFile) {
            this.element.innerHTML = (`
                <img src="assets/images/UI/titlescreen.png" alt="Lovebirds Title Screen" />
                <div class="TitleScreen_div">
                    <button id="newgame" class="TitleScreen_button" onmouseover="window.hovered(true, this.id)" onmouseleave="window.hovered(false, this.id)" onclick=window.startNewGame()>New Game</button>
                    </br>
                    <button id="continue" class="TitleScreen_button" onmouseover="window.hovered(true, this.id)" onmouseleave="window.hovered(false, this.id)" onclick=window.continueGame()>Continue</button>
                </div>
            `);
        }
        else {
            this.element.innerHTML = (`
                <img src="assets/images/UI/titlescreen.png" alt="Lovebirds Title Screen" />
                <div class="TitleScreen_div">
                    <button id="newgame" class="TitleScreen_button" onmouseover="window.hovered(true, this.id)" onmouseleave="window.hovered(false, this.id)" onclick=window.startNewGame()>New Game</button>
                </div>
            `);
        }

    }

    close(newGame=false) {
        if (newGame) { this.saveFile = null; }
        this.element.remove();
        this.onComplete(this.saveFile);
    }

    init(container) {
        return new Promise(resolve => {
            this.createElement();
            container.appendChild(this.element);
            this.onComplete = resolve;
        })

    }
}

window.hovered = function (state, id) {
    let elem = document.getElementById(id);
    switch (state) {
        case true:
            elem.classList.add("hovered");
            break;

        case false:
            elem.classList.remove("hovered");
            break;

    }
}

window.startNewGame = function () {
    window.titleScreen.close(true);
}

window.continueGame = function () {
    window.titleScreen.close();
}