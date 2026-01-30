class ShowMessage {
    constructor(text) {
        this.text = text || "Z to interact";
        this.element = null;
    }

    createElement() {
        this.element = document.createElement("div");
        this.element.classList.add("ShowMessage");

        this.element.innerHTML = (`
            <p class="TextMessage_p">${this.text}</p>
        `);
    }

    init(container) {
        this.createElement();
        container.appendChild(this.element);
    }
}