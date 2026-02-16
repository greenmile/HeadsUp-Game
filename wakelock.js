class WakeLockManager {
    static sentinel = null;
    static videoElement = null;

    static async request() {
        console.log('[WakeLock] Requesting wake lock...');

        // 1. Try Native API
        if ('wakeLock' in navigator) {
            try {
                this.sentinel = await navigator.wakeLock.request('screen');
                console.log('[WakeLock] Native lock acquired');

                this.sentinel.addEventListener('release', () => {
                    console.log('[WakeLock] Native lock released');
                    this.sentinel = null;
                });
                return;
            } catch (err) {
                console.warn('[WakeLock] Native request failed:', err);
            }
        }

        // 2. Fallback: Hidden Video Loop (NoSleep strategy)
        console.log('[WakeLock] engaging video fallback');
        this.enableVideoFallback();
    }

    static release() {
        // Release native lock
        if (this.sentinel) {
            this.sentinel.release();
            this.sentinel = null;
        }

        // Stop video fallback
        if (this.videoElement) {
            this.videoElement.pause();
            this.videoElement.src = '';
            this.videoElement.remove();
            this.videoElement = null;
            console.log('[WakeLock] Video fallback stopped');
        }
    }

    static enableVideoFallback() {
        if (this.videoElement) return;

        // Create a tiny video element
        const video = document.createElement('video');
        video.setAttribute('playsinline', '');
        video.setAttribute('no-fullscreen', '');
        video.setAttribute('loop', '');
        video.setAttribute('muted', ''); // Essential for auto-play without gesture issues sometimes

        // Base64 of a tiny 1-second black mp4 (essential for this hack)
        // Source: NoSleep.js
        video.src = 'data:video/mp4;base64,AAAAHGZ0eXBtcDQyAAAAAG1wNDJpc29tAAAAAAAzdXZkbwAAAAwLAAAAAZAyAAAAA21kYXQAAAAAAAAAH2hkbHIAAAAAAAAAAG1obHIAAAAAAAAAAAAAAAAAAAhkaW5mAAAAHGRyZWYAAAAAAAAAAQAAAAx1cmwgAAAAAQAAAA5odHGsAAAAAAA+bWQIAAAAHHN0dHMAAAAAAAAAAQAAAAEAAAAeAAAAAAAadHRz/wAAAAAAAAABAAAAAQAAAAEAAAAAAAChY3R0cwAAAAAAAAABAAAAAQAAAAEAAAAUAAAAGHN0c2MAAAAAAAAAAQAAAAEAAAABAAAAFHN0c3oAAAAAAAAAEwAAAAEAAAAUc3RjbwAAAAAAAAABAAAAAAAuhXRrakxhYWxhYWRmYXNkZGFzZGFzZGFzZGFzZGFzZA==';

        video.style.opacity = '0';
        video.style.position = 'absolute';
        video.style.pointerEvents = 'none';
        video.style.zIndex = '-1';
        video.style.width = '1px';
        video.style.height = '1px';

        document.body.appendChild(video);

        // Try to play
        video.play().then(() => {
            console.log('[WakeLock] Video fallback playing');
            this.videoElement = video;
        }).catch(e => {
            console.warn('[WakeLock] Video fallback failed:', e);
            video.remove();
        });
    }

    static init() {
        // Re-acquire lock on visibility change (Native API behavior)
        document.addEventListener('visibilitychange', async () => {
            if (document.visibilityState === 'visible' && window.gameState && window.gameState.isPlaying) {
                console.log('[WakeLock] App visible, re-requesting lock');
                await this.request();
            }
        });
    }
}

// Global export
window.WakeLockManager = WakeLockManager;
