document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const videoPreview = document.getElementById('videoPreview');
    const timeline = document.getElementById('timeline');
    const playButton = document.querySelector('.play-btn');
    const importButton = document.querySelector('.import-btn');
    const timelineContent = document.querySelector('.timeline-content');

    let video = null;
    let isPlaying = false;

    // จัดการการนำเข้าวิดีโอ
    importButton.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'video/*';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const videoURL = URL.createObjectURL(file);
                createVideoElement(videoURL);
                timelineContent.style.backgroundColor = '#8a2be2'; // เปลี่ยนสีไทม์ไลน์เป็นสีม่วง
            }
        };
        
        input.click();
    });

    // สร้าง video element
    function createVideoElement(url) {
        if (video) {
            video.remove();
        }

        video = document.createElement('video');
        video.src = url;
        video.style.maxWidth = '100%';
        video.style.maxHeight = '100%';
        videoPreview.appendChild(video);

        // เพิ่ม event listeners สำหรับการควบคุมวิดีโอ
        setupVideoControls();
    }

    // ตั้งค่าการควบคุมวิดีโอ
    function setupVideoControls() {
        // Play/Pause
        playButton.addEventListener('click', togglePlay);

        // First Frame
        document.querySelector('.fa-fast-backward').parentElement.addEventListener('click', () => {
            if (video) {
                video.currentTime = 0;
            }
        });

        // Last Frame
        document.querySelector('.fa-fast-forward').parentElement.addEventListener('click', () => {
            if (video) {
                video.currentTime = video.duration;
            }
        });

        // Previous Frame
        document.querySelector('.fa-step-backward').parentElement.addEventListener('click', () => {
            if (video) {
                video.currentTime = Math.max(0, video.currentTime - 1/30);
            }
        });

        // Next Frame
        document.querySelector('.fa-step-forward').parentElement.addEventListener('click', () => {
            if (video) {
                video.currentTime = Math.min(video.duration, video.currentTime + 1/30);
            }
        });
    }

    // สลับการเล่น/หยุดวิดีโอ
    function togglePlay() {
        if (!video) return;

        if (isPlaying) {
            video.pause();
            playButton.innerHTML = '<i class="fas fa-play"></i>';
        } else {
            video.play();
            playButton.innerHTML = '<i class="fas fa-pause"></i>';
        }
        
        isPlaying = !isPlaying;
    }

    // Blur Auto button
    const blurAutoButton = document.querySelector('.blur-auto-btn');
    blurAutoButton.addEventListener('click', () => {
        if (!video) {
            alert('กรุณานำเข้าวิดีโอก่อน');
            return;
        }
        // เพิ่มโค้ดสำหรับการ blur อัตโนมัติที่นี่
    });

    // Export button
    const exportButton = document.querySelector('.export-btn');
    exportButton.addEventListener('click', () => {
        if (!video) {
            alert('กรุณานำเข้าวิดีโอก่อน');
            return;
        }
        // เพิ่มโค้ดสำหรับการส่งออกวิดีโอที่นี่
    });
}); 