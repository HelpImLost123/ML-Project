class FaceBlurTool {
    constructor() {
        this.canvas = document.getElementById('previewCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.mediaInput = document.getElementById('mediaInput');
        this.blurIntensity = document.getElementById('blurIntensity');
        this.confidenceThreshold = document.getElementById('confidenceThreshold');
        this.statusText = document.getElementById('statusText');
        this.facesList = document.getElementById('facesList');
        this.personList = document.getElementById('personList');
        this.addPersonBtn = document.getElementById('addPersonBtn');
        this.people = [];

        this.videoControls = document.querySelector('.video-controls');
        this.playPauseBtn = document.getElementById('playPauseBtn');
        // Add play/pause control
        this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());

        // Add to your event listeners
        this.autoDetectBtn = document.getElementById('autoDetectBtn');
        this.autoDetectBtn.addEventListener('click', () => this.processWithModel());
        
        // Add this to initializeEvents()
        this.addPersonBtn.addEventListener('click', () => this.addNewPerson());

        this.currentMedia = null;
        this.facesNotToBlur = [];
        
        this.initializeEvents();
    }

    initializeEvents() {
        this.mediaInput.addEventListener('change', (e) => this.handleMediaInput(e));
        document.getElementById('autoDetectBtn').addEventListener('click', () => this.detectFaces());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportMedia());
    }

    // Media handling methods
    async handleMediaInput(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (file.type.startsWith('video/')) {
            this.currentMedia = null;
            this.facesNotToBlur = [];
            this.updateFacesList();
            this.videoControls.style.display = 'block';
            await this.loadVideo(file);
        } else {
            this.updateStatus('Error loading video');
        }
    }

    async loadVideo(file) {
        this.updateStatus('Loading video...');
        const video = document.createElement('video');
        video.autoplay = false;
        video.loop = false;
        video.setAttribute('controls', '');
        video.setAttribute('src', URL.createObjectURL(file));

        video.onloadeddata = () => {
            this.currentMedia = video;
            this.canvas.width = video.videoWidth;
            this.canvas.height = video.videoHeight;
            this.updateStatus('Video loaded');
            const previewArea = document.querySelector('.preview-area');
            this.canvas.style.display = 'none';
            previewArea.appendChild(video);
            this.videoControls.style.display = 'block'; // Show video controls for videos
        };
    }

    // addVideoPlayer(videoUrl) {
    //     const previewArea = document.querySelector('.preview-area');

    //     // Create video element
    //     const videoElement = document.createElement('video');
    //     videoElement.setAttribute('controls', ''); // Built-in controls (play, pause, volume, etc.)
    //     videoElement.setAttribute('src', videoUrl); // Set the video source

    //     // Hide canvas and append video to preview area
    //     const canvas = document.getElementById('previewCanvas');
    //     canvas.style.display = 'none'; // Hide canvas once video is added

    //     previewArea.appendChild(videoElement); // Append the video element to preview area
    // }

    //Play pause button for video
    togglePlayPause() {
        if (!this.currentMedia || !this.isVideo) return;
        
        if (this.currentMedia.paused) {
            this.currentMedia.play();
            this.playPauseBtn.textContent = 'Pause';
        } else {
            this.currentMedia.pause();
            this.playPauseBtn.textContent = 'Play';
        }
    }

    

    async processVideo() {
        if (!this.isVideo || !this.faceDetector) return;
        await new Promise(resolve => {
            this.currentMedia.addEventListener('canplay', resolve, { once: true });
        });

        // เริ่มต้นจากจุดเริ่มต้นวิดีโอ
        this.currentMedia.currentTime = 0;
        
        // ตั้งค่าการบันทึก
        const stream = this.canvas.captureStream(30);
        this.mediaRecorder = new MediaRecorder(stream, { 
            mimeType: 'video/webm;codecs=vp9',
            videoBitsPerSecond: 5000000 // เพิ่มคุณภาพวิดีโอ
        });
        
        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.recordedChunks.push(event.data);
            }
        };

        // เริ่มบันทึก
        this.mediaRecorder.start(1000); // บันทึกทุกๆ 1 วินาที

        // ประมวลผลแต่ละเฟรม
        const processFrame = async () => {
            if (this.currentMedia.ended) {
                this.mediaRecorder.stop();
                return;
            }

            this.ctx.drawImage(this.currentMedia, 0, 0);
            await this.detectFaces();
            this.applyBlur();

            requestAnimationFrame(processFrame);
        };

        // เริ่มเล่นวิดีโอและประมวลผล
        this.currentMedia.play();
        processFrame();
    }

    exportMedia() {
        if (this.isVideo) {
            if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
                this.currentMedia.pause();
                this.mediaRecorder.stop();
            }

            // รอให้การบันทึกเสร็จสิ้นแล้วค่อย export
            this.mediaRecorder.onstop = () => {
                const blob = new Blob(this.recordedChunks, { 
                    type: 'video/webm;codecs=vp9'
                });
                
                // สร้าง URL สำหรับดาวน์โหลด
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'processed-video.webm';
                a.click();
                
                // ทำความสะอาด
                URL.revokeObjectURL(url);
                this.recordedChunks = [];
                
                // รีเซ็ตวิดีโอ
                this.currentMedia.currentTime = 0;
                this.currentMedia.play();
            };
        } else {
            // ... existing image export code ...
            this.canvas.toBlob(blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'blurred-image.png';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            });
        }
    }

// Add these new methods
    async addNewPerson() {
        const name = await this.showPrompt('Enter person name:');
        if (!name) return;

        const person = {
            id: Date.now(),
            name: name
        };

        this.people.push(person);
        this.createPersonFolder(person);
        this.updatePersonList();
    }

    showPrompt(message) {
        return new Promise((resolve) => {
            const name = prompt(message);
            resolve(name);
        });
    }

    createPersonFolder(person) {
        const personElement = document.createElement('div');
        personElement.className = 'person-item';
        personElement.innerHTML = `
            <span class="folder-icon">📁</span>
            <span>${person.name}</span>
        `;
        personElement.addEventListener('click', () => this.selectPerson(person));
        this.personList.appendChild(personElement);
    }

    updatePersonList() {
        this.personList.innerHTML = '';
        this.people.forEach(person => {
            this.createPersonFolder(person);
        });
    }

    selectPerson(person) {
        // Create hidden file input for image selection
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.multiple = true;
        fileInput.accept = 'image/*';
        
        fileInput.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files);
            if (files.length > 0) {
                try {
                    await this.sendImagesToBackend(person.name, files);
                    this.updateStatus(`Images uploaded for ${person.name}`);
                } catch (error) {
                    this.updateStatus('Failed to upload images');
                }
            }
        });
        
        fileInput.click();
    }

    //Auto blur button
    async processWithModel() {
        if (!this.currentMedia) {
            this.updateStatus('Please import an file first');
            return;
        }

        this.updateStatus('Processing with trained model...');

        try {
            // Convert canvas to blob
            const blob = await new Promise(resolve => {
                this.canvas.toBlob(resolve, 'image/jpeg');
            });

            // Create form data
            const formData = new FormData();
            formData.append('image', blob);

            // Send to backend
            const response = await fetch('http://localhost:5000/process_image', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Processing failed');
            }

            // Display processed image
            const processedBlob = await response.blob();
            const processedUrl = URL.createObjectURL(processedBlob);
            const processedImg = new Image();
            
            processedImg.onload = () => {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                this.ctx.drawImage(processedImg, 0, 0);
                this.updateStatus('Processing complete');
                URL.revokeObjectURL(processedUrl);
            };
            
            processedImg.src = processedUrl;

        } catch (error) {
            this.updateStatus('Error processing image');
            console.error(error);
        }
    }

    //Person selector
    async sendImagesToBackend(name, files) {
        const formData = new FormData();
        formData.append('name', name);
        files.forEach(file => {
            formData.append('faces', file);
        });

        try {
            this.updateStatus('Uploading images...');
            const response = await fetch('http://localhost:5000/process_video', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error('Upload failed');
            }
            
            const result = await response.json();
            console.log('Upload successful:', result);
            return result;
        } catch (error) {
            console.error('Error uploading images:', error);
            this.updateStatus('Failed to upload images');
            throw error;
        }
    }
    updateFacesList() {
        this.facesList.innerHTML = '';
        this.detectedFaces.forEach((face, index) => {
            const li = document.createElement('li');
            li.textContent = `Face ${index + 1} (Confidence: ${(face.detection.score * 100).toFixed(1)}%)`;
            this.facesList.appendChild(li);
        });
    }

    updateStatus(message) {
        this.statusText.textContent = message;
    }

    updateBlurIntensity(value) {
        blurIntensityValue.textContent = value;
    }
    
    updateConfidenceValue(value) {
        confidenceValue.textContent = value;
    }
}



// Initialize the tool when the page loads
window.addEventListener('DOMContentLoaded', () => {
    new FaceBlurTool();
});
