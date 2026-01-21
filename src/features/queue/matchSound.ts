let audio: HTMLAudioElement | null = null;
let isUnlocked = false;

const getAudio = (): HTMLAudioElement => {
	if (!audio) {
		audio = new Audio("/sounds/match.wav");
		audio.preload = "auto";
	}
	return audio;
};

export const unlockMatchSound = async (): Promise<void> => {
	try {
		const target = getAudio();
		const prevVolume = target.volume;
		target.volume = 0;
		await target.play();
		target.pause();
		target.currentTime = 0;
		target.volume = prevVolume;
		isUnlocked = true;
	} catch {
		// ignore autoplay restrictions
	}
};

export const playMatchSound = async (): Promise<void> => {
	try {
		const target = getAudio();
		if (!isUnlocked) {
			// If not unlocked yet, try to unlock silently.
			await unlockMatchSound();
		}
		target.currentTime = 0;
		await target.play();
	} catch {
		// ignore autoplay restrictions / user settings
	}
};
