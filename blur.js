class FaceBlurTool {
    constructor() {
        this.input = document.getElementById('input');
        this.importButton = document.getElementById('import');
        this.blurIntensity = document.getElementById('blurIntensity');
        this.confidenceThreshold = document.getElementById('confidenceThreshold');
        this.autoDetectBtn = document.getElementById('autoDetectBtn');
        this.statusText = document.getElementById('statusText');
        this.facesList = document.getElementById('facesList');
        this.personList = document.getElementById('personList');
        this.addPersonBtn = document.getElementById('addPersonBtn');
        this.showOriginalBtn = document.getElementById('showOriBtn');
        this.showProcessedBtn = document.getElementById('showProBtn');
        this.clearAllBtn = document.getElementById('clearAllBtn');
        this.exportBtn = document.getElementById('exportBtn');
        this.facesNotToBlur = [];
        this.currentMedia = null;
        this.processedMedia = null;

        this.input.addEventListener('change', (e) => this.handleMediaInput(e));

        // Add to your event listeners
        this.autoDetectBtn = document.getElementById('autoDetectBtn');
        this.autoDetectBtn.addEventListener('click', () => this.processWithModel());
        this.addPersonBtn.addEventListener('click', () => this.addPicture());
        this.clearAllBtn.addEventListener('click', () => this.clearAllImages());
        // this.showOriginalBtn.addEventListener('click', () => {
        //     if (!this.processedMedia) return;
        //     this.processedMedia.style.display = 'none';
        //     this.currentMedia.style.display = 'block';
        // });
        // this.showProcessedBtn.addEventListener('click', () => {
        //     if (!this.processedMedia) return;
        //     this.currentMedia.style.display = 'none';
        //     this.processedMedia.style.display = 'block';
        // });
    }

    // Media handling methods
    handleMediaInput(event) {
        this.importButton.textContent = 'Importing...';
        this.updateStatus('');
        const file = event.target.files[0];
        this.importButton.textContent = 'Import';
        if (!file) return;

        if (file.type.startsWith('video/')) {
            this.currentMedia = null;
            const previewArea = document.querySelector('.preview-area');
            previewArea.innerHTML = ''; // Clear any existing content
            // await this.loadVideo(file);
            this.updateStatus('Loading video...');
            const video = document.createElement('video');
            video.autoplay = false;
            video.loop = false;
            video.setAttribute('controls', '');
            video.setAttribute('src', URL.createObjectURL(file));
            video.classList.add('preview-video');
            video.id = 'preview-video';
            this.currentMedia = video;
            this.updateStatus('Video loaded');

            video.onloadeddata = () => {
                this.currentMedia = video;
                this.updateStatus('Video loaded');

                const existingMedia = previewArea.querySelector('preview-video');
                if (existingMedia) {
                    previewArea.removeChild(existingMedia);
                }
                previewArea.appendChild(video);
            };
        } else if (file.type.startsWith('image/')) {
            this.currentMedia = null;
            const previewArea = document.querySelector('.preview-area');
            previewArea.innerHTML = ''; // Clear any existing content
            this.updateStatus('Loading image...');
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            img.classList.add('preview-image');
            img.id = 'preview-image';
            this.currentMedia = img;
            this.updateStatus('Image loaded');

            img.onload = () => {
                this.currentMedia = img;
                this.updateStatus('Image loaded');

                const existingMedia = previewArea.querySelector('preview-image');
                if (existingMedia) {
                    previewArea.removeChild(existingMedia);
                }
                previewArea.appendChild(img);
            };
        }else {
            this.updateStatus('Error loading video');
        }
    }

    showPrompt(message) {
        return new Promise((resolve) => {
            const name = prompt(message);
            resolve(name);
        });
    }

    addPicture() {
        // Create hidden file input for image selection
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.multiple = true;
        fileInput.accept = 'image/*';
        
        fileInput.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files);
            if (files.length > 0) {
                try {
                    this.addImagesToFacesList(files);
                    this.updateStatus(`Images added to face list`);
                } catch (error) {
                    this.updateStatus('Failed to add images');
                }
            }
        });
        console.log(fileInput);
        
        fileInput.click();
        fileInput.remove();
    }

    addImagesToFacesList(files) {
        files.forEach(file => {
            this.facesNotToBlur.push(file);

            const reader = new FileReader();
            reader.onload = (e) => {
                const li = document.createElement('li');
                const img = document.createElement('img');
                img.src = e.target.result;
                li.appendChild(img);
                this.facesList.appendChild(li);
            };
            reader.readAsDataURL(file);
        });
    }

    clearAllImages() {
        if (confirm('Are you sure you want to clear all images?')) {
            this.facesList.innerHTML = ''; // Clear the facesList
            this.facesNotToBlur = []; // Clear the facesNotToBlur array
            this.updateStatus('All images cleared');
            console.log(this.facesNotToBlur);
        }
    }

    //Auto blur button
    async processWithModel() {
        if (!this.currentMedia) {
            this.updateStatus('Please import an file first');
            return;
        }

        this.updateStatus('Processing with trained model...');
        
        try {
            // Create form data
            const formData = new FormData();
            
            formData.append('threshold', this.confidenceThreshold.value);
            formData.append('blur_amount', this.blurIntensity.value);

            const Blob = await fetch(this.currentMedia.src).then(r => r.blob());
            let response;
            if (this.currentMedia.tagName === 'IMG') {
                formData.append('image', Blob, 'image.jpg');
                console.log('processing image');
                console.log(Blob);
            } else if (this.currentMedia.tagName === 'VIDEO') {
                formData.append('video', Blob, 'video.mp4');
                console.log('processing video');
                console.log(Blob);
            }

            this.facesNotToBlur.forEach((file, index) => {
                formData.append(`face_image_${index}`, file);
            });
            console.log(formData);
            // Send to backend
            if (this.currentMedia.tagName === 'IMG') {
                const response = await fetch('http://localhost:5000/process_image', {
                    method: 'POST',
                    body: formData
                });
                if (!response.ok) {
                    throw new Error('Processing failed');
                }
            } else if (this.currentMedia.tagName === 'VIDEO') {
                const response = await fetch('http://localhost:5000/process_video', {
                    method: 'POST',
                    body: formData
                });
                if (!response.ok) {
                    throw new Error('Processing failed');
                }
            }

            // const response = await fetch('http://localhost:5000/dummy_video', {
            //     method: 'POST',
            // });

            // Display processed video
            // const processedBlob = await response.blob();
            // console.log(processedBlob);
            // const processedUrl = URL.createObjectURL(processedBlob);
            // console.log(processedUrl);
            // const processedVideo = document.createElement('video');
            // processedVideo.src = processedUrl;
            // processedVideo.controls = true;
            // processedVideo.autoplay = false;
            // processedVideo.loop = false;
            // processedVideo.classList.add('preview-video');
            // processedVideo.id = 'processed-video';

            // const downloadLink = document.createElement('a');
            // downloadLink.href = processedUrl;
            // downloadLink.download = 'processed_video.mp4';
            // document.body.appendChild(downloadLink);
            // downloadLink.click();
            // document.body.removeChild(downloadLink);

            // const previewArea = document.querySelector('.preview-area');
            // previewArea.innerHTML = ''; // Clear any existing content
            // this.currentMedia.style.display = 'none';
            // this.processedMedia = processedVideo;
            // previewArea.appendChild(processedVideo);
            this.updateStatus('Processing complete');

            // // Enable export button
            // this.exportBtn.href = processedUrl;
            // this.exportBtn.download = 'processed_video.mp4';
            // this.exportBtn.style.display = 'inline-block';
        } catch (error) {
            this.updateStatus('Error processing image');
            console.error(error);
        }
    }

    updateStatus(message) {
        this.statusText.textContent = message;
    }
}



// Initialize the tool when the page loads
window.addEventListener('DOMContentLoaded', () => {
    console.log('Page loaded');
    new FaceBlurTool();
});
