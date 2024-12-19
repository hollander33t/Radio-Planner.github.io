class RadioManager {
    constructor() {
        this.schedule = this.loadSchedule();
        this.currentStream = null;
        this.audio = new Audio(); // Maak een nieuw audio-object aan
    }

    addToSchedule(time, station) {
        this.schedule.push({ time, station });
        this.saveSchedule();
    }

    removeLastFromSchedule() {
        this.schedule.pop();
        this.saveSchedule();
    }

    saveSchedule() {
        localStorage.setItem('radioSchedule', JSON.stringify(this.schedule));
    }

    loadSchedule() {
        const saved = localStorage.getItem('radioSchedule');
        return saved ? JSON.parse(saved) : [];
    }

    async playStream(url) {
        console.log(`Playing stream: ${url}`);

        // Stop de huidige stream als er een is
        if (this.currentStream) {
            this.currentStream.pause();
        }

        // Stel de nieuwe stream in
        this.audio.src = url; // Gebruik de URL van de radiozender
        this.audio.play().catch(error => {
            console.error('Error playing stream:', error);
            alert('Er is een probleem met het afspelen van de stream. Controleer de console voor meer informatie.');
        });

        // Bewaar de huidige stream
        this.currentStream = this.audio;
    }

    pauseStream() {
        if (this.currentStream) {
            this.currentStream.pause();
        }
    }

    setVolume(volume) {
        if (this.currentStream) {
            this.currentStream.volume = volume;
        }
    }
}
