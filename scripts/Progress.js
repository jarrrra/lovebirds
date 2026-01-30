class Progress {
    constructor() {
        this.mapId = "VNPartMCHouse";
        this.mapLevel = 0;
        this.saveFileKey = "Lovebirds_SaveFile1";
        this.musicSrc = "VNStartMC";
    }

    save() {
        window.localStorage.setItem(this.saveFileKey, JSON.stringify({
            mapId: this.mapId,
            mapLevel: this.mapLevel,
            musicSrc: this.musicSrc
        }))
    }

    getSaveFile() {
        const file = window.localStorage.getItem(this.saveFileKey);
        return file ? JSON.parse(file) : null
    }

    load() {
        const file = this.getSaveFile();
        if (file) {
            this.mapId = file.mapId;
            this.mapLevel = file.mapLevel;
            this.musicSrc = file.musicSrc;
        }
    }
}
