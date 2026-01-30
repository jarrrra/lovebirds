class VNCharacter{
    constructor(config) {
        this.image = new Image();
        this.imageChangeSrc(config.src || "empty");
        this.image.onload = () => {
            this.isLoaded = true;
        };
    }

    imageChangeSrc(src) {
        this.image.src = "/assets/images/characters/VN/" + src + ".png";
    }

    draw(ctx) {
        this.isLoaded && ctx.drawImage(this.image, 0, 0);
    }
}