class FaceBlurTool {
    constructor() {
        this.canvas = document.getElementById('previewCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.mediaInput = document.getElementById('mediaInput');
        this.blurIntensity = document.getElementById('blurIntensity');
        this.confidenceThreshold = document.getElementById('confidenceThreshold');
        this.statusText = document.getElementById('statusText');
        this.facesList = document.getElementById('facesList');
        
        this.currentMedia = null;
        this.detectedFaces = [];
        this.isVideo = false;
        this.faceDetector = null;
        this.mediaRecorder = null;
        this.recordedChunks = [];

        this.initializeEvents();
        this.loadFaceDetector();
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

    initializeEvents() {
        this.mediaInput.addEventListener('change', (e) => this.handleMediaInput(e));
        document.getElementById('autoDetectBtn').addEventListener('click', () => this.detectFaces());
        document.getElementById('manualBlurBtn').addEventListener('click', () => this.enableManualBlur());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportMedia());
    }

    async handleMediaInput(event) {
        const file = event.target.files[0];
        if (!file) return;

        this.currentMedia = null;
        this.detectedFaces = [];
        this.updateFacesList();

        if (file.type.startsWith('image/')) {
            this.isVideo = false;
            await this.loadImage(file);
        } else if (file.type.startsWith('video/')) {
            this.isVideo = true;
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
            this.ctx.drawImage(img, 0, 0);
            this.updateStatus('Image loaded');
        };
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
            
            // Start processing the video frame
            this.processVideo();
        };
    }

    async processVideo() {
        if (!this.isVideo || !this.faceDetector) return;

        // Capture video stream
        const stream = this.canvas.captureStream(30); // 30fps
        this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        
        this.mediaRecorder.ondataavailable = (event) => {
            this.recordedChunks.push(event.data);
        };

        this.mediaRecorder.onstop = () => {
            const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
            this.recordedChunks = [];
            this.exportVideo(blob);
        };

        // Start recording
        this.mediaRecorder.start();

        // Process the video frames
        const processFrame = async () => {
            if (this.currentMedia.paused || this.currentMedia.ended) return;
            
            // Draw the video frame onto the canvas
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.drawImage(this.currentMedia, 0, 0);

            // Detect faces
            await this.detectFaces();
            this.applyBlur();

            // Request the next frame for processing
            requestAnimationFrame(processFrame);
        };
        processFrame();
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

    exportMedia() {
        if (this.isVideo && this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.stop();
        } else {
            // Handle image export
            this.canvas.toBlob(blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'blurred-image.png';
                a.click();
                URL.revokeObjectURL(url);
            });
        }
    }

    exportVideo(blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'blurred-video.webm';
        a.click();
        URL.revokeObjectURL(url);
    }
}

// Initialize the tool when the page loads
window.addEventListener('DOMContentLoaded', () => {
    new FaceBlurTool();
});
