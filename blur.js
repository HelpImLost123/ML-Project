class FaceBlurTool {
    constructor() {
        this.canvas = document.getElementById('previewCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.overlay = document.getElementById('drawingOverlay');
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
        this.detectedFaces = [];
        this.isVideo = false;
        this.faceDetector = null;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        
        // Manual blur properties
        this.isManualBlurMode = false;
        this.isDrawing = false;
        this.lastX = 0;
        this.lastY = 0;

        this.initializeEvents();
        this.loadFaceDetector();
    }

    initializeEvents() {
        this.mediaInput.addEventListener('change', (e) => this.handleMediaInput(e));
        document.getElementById('autoDetectBtn').addEventListener('click', () => this.detectFaces());
        document.getElementById('manualBlurBtn').addEventListener('click', () => this.toggleManualBlur());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportMedia());
        
        // Manual blur events
        this.overlay.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.overlay.addEventListener('mousemove', (e) => this.draw(e));
        this.overlay.addEventListener('mouseup', () => this.stopDrawing());
        this.overlay.addEventListener('mouseout', () => this.stopDrawing());
    }

    // Media handling methods
    async handleMediaInput(event) {
        const file = event.target.files[0];
        if (!file) return;

        this.currentMedia = null;
        this.detectedFaces = [];
        this.updateFacesList();

        if (file.type.startsWith('image/')) {
            this.isVideo = false;
            this.videoControls.style.display = 'none';
            await this.loadImage(file);
        } else if (file.type.startsWith('video/')) {
            this.isVideo = true;
            this.videoControls.style.display = 'block';
            await this.loadVideo(file);
        }
    }

    async loadImage(file) {
        this.updateStatus('Loading image...');
        const img = new Image();
        img.src = URL.createObjectURL(file);
        
        img.onload = () => {
            this.currentMedia = img;
            this.canvas.width = img.width;
            this.canvas.height = img.height;
            this.setupOverlay(); // Set overlay dimensions
            this.ctx.drawImage(img, 0, 0);
            this.updateStatus('Image loaded');
            this.videoControls.style.display = 'none'; // Hide video controls for images
        };
    }

    // Manual blur methods
    toggleManualBlur() {
        this.isManualBlurMode = !this.isManualBlurMode;
        
        if (this.isManualBlurMode) {
            this.setupOverlay();
            this.overlay.style.cursor = 'crosshair';
            document.getElementById('manualBlurBtn').classList.add('active');
        } else {
            this.overlay.style.cursor = 'default';
            document.getElementById('manualBlurBtn').classList.remove('active');
        }
    }

    setupOverlay() {
        // ปรับขนาด overlay ให้ตรงกับ canvas
        this.overlay.width = this.canvas.width;
        this.overlay.height = this.canvas.height;
        
        // คำนวณ scale เพื่อปรับขนาดการแสดงผล
        const canvasRect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / canvasRect.width;
        const scaleY = this.canvas.height / canvasRect.height;
        
        this.overlay.style.width = `${canvasRect.width}px`;
        this.overlay.style.height = `${canvasRect.height}px`;
        
        // เก็บค่า scale ไว้ใช้ในการคำนวณตำแหน่ง
        this.scaleX = scaleX;
        this.scaleY = scaleY;
    }

    startDrawing(e) {
        if (!this.isManualBlurMode) return;
        this.isDrawing = true;
        const rect = this.overlay.getBoundingClientRect();
        // ปรับตำแหน่งตาม scale
        this.lastX = (e.clientX - rect.left) * this.scaleX;
        this.lastY = (e.clientY - rect.top) * this.scaleY;
    }

    draw(e) {
        if (!this.isManualBlurMode || !this.isDrawing) return;
        
        const rect = this.overlay.getBoundingClientRect();
        // ปรับตำแหน่งตาม scale
        const currentX = (e.clientX - rect.left) * this.scaleX;
        const currentY = (e.clientY - rect.top) * this.scaleY;
        
        const distance = Math.sqrt(
            Math.pow(currentX - this.lastX, 2) + 
            Math.pow(currentY - this.lastY, 2)
        );
        
        const steps = Math.max(Math.floor(distance), 1);
        for (let i = 0; i <= steps; i++) {
            const x = this.lastX + (currentX - this.lastX) * (i / steps);
            const y = this.lastY + (currentY - this.lastY) * (i / steps);
            this.applyBlurAtPoint(x, y);
        }
        
        this.lastX = currentX;
        this.lastY = currentY;
    }

    stopDrawing() {
        this.isDrawing = false;
        const ctx = this.overlay.getContext('2d');
        ctx.clearRect(0, 0, this.overlay.width, this.overlay.height);
    }

    applyBlurAtPoint(x, y) {
        const radius = 20;
        const blurAmount = parseInt(this.blurIntensity.value);
        
        const imageData = this.ctx.getImageData(
            Math.max(0, x - radius),
            Math.max(0, y - radius),
            radius * 2,
            radius * 2
        );
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = imageData.width;
        tempCanvas.height = imageData.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.putImageData(imageData, 0, 0);
        
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.clip();
        this.ctx.filter = `blur(${blurAmount}px)`;
        
        this.ctx.drawImage(
            tempCanvas,
            Math.max(0, x - radius),
            Math.max(0, y - radius)
        );
        
        this.ctx.restore();
    }

    async loadFaceDetector() {
        this.updateStatus('Loading face detection model...');
        try {
            this.faceDetector = await faceDetection.createDetector(
                faceDetection.SupportedModels.MediaPipeFaceDetector,
                { runtime: 'tfjs' }
            );
            this.updateStatus('Ready to process');
        } catch (error) {
            this.updateStatus('Error loading face detection model');
            console.error(error);
        }
    }

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

    async loadVideo(file) {
        this.updateStatus('Loading video...');
        const video = document.createElement('video');
        video.src = URL.createObjectURL(file);
        video.autoplay = true;
        video.loop = true;

        video.onloadeddata = () => {
            this.currentMedia = video;
            this.canvas.width = video.videoWidth;
            this.canvas.height = video.videoHeight;
            this.updateStatus('Video loaded');
            this.videoControls.style.display = 'block'; // Show video controls for videos
            // Start processing the video frame
            this.processVideo();
        };
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

    async detectFaces() {
        if (!this.currentMedia || !this.faceDetector) return;

        this.updateStatus('Detecting faces...');
        try {
            this.detectedFaces = await this.faceDetector.estimateFaces(this.currentMedia);
            this.updateStatus(`Detected ${this.detectedFaces.length} faces`);
            this.updateFacesList();
            this.applyBlur();
        } catch (error) {
            this.updateStatus('Error detecting faces');
            console.error(error);
        }
    }

    applyBlur() {
        if (!this.currentMedia || !this.detectedFaces.length) return;

        // Create temporary canvas for blur effect
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        const tempCtx = tempCanvas.getContext('2d');

        // Draw original image
        tempCtx.drawImage(this.currentMedia, 0, 0);

        // Apply blur to each face
        this.detectedFaces.forEach(face => {
            const { topLeft, bottomRight } = face.box;
            const width = bottomRight[0] - topLeft[0];
            const height = bottomRight[1] - topLeft[1];

            // Extract face region
            const faceData = tempCtx.getImageData(topLeft[0], topLeft[1], width, height);
            
            // Apply blur
            const blurredFace = this.blurImageData(faceData, this.blurIntensity.value);
            
            // Put blurred face back
            tempCtx.putImageData(blurredFace, topLeft[0], topLeft[1]);
        });

        // Draw final result
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(tempCanvas, 0, 0);
    }

    blurImageData(imageData, intensity) {
        // Simple box blur implementation
        const pixels = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const blurRadius = parseInt(intensity);
        
        // Create output array
        const output = new Uint8ClampedArray(pixels.length);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let r = 0, g = 0, b = 0, a = 0;
                let count = 0;
                
                // Box blur kernel
                for (let ky = -blurRadius; ky <= blurRadius; ky++) {
                    for (let kx = -blurRadius; kx <= blurRadius; kx++) {
                        const px = x + kx;
                        const py = y + ky;
                        
                        if (px >= 0 && px < width && py >= 0 && py < height) {
                            const i = (py * width + px) * 4;
                            r += pixels[i];
                            g += pixels[i + 1];
                            b += pixels[i + 2];
                            a += pixels[i + 3];
                            count++;
                        }
                    }
                }
                
                // Calculate average
                const i = (y * width + x) * 4;
                output[i] = r / count;
                output[i + 1] = g / count;
                output[i + 2] = b / count;
                output[i + 3] = a / count;
            }
        }
        
        return new ImageData(output, width, height);
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
}

// Initialize the tool when the page loads
window.addEventListener('DOMContentLoaded', () => {
    new FaceBlurTool();
});
