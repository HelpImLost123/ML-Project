from flask import Flask, request, send_file
import tempfile
import cv2
import numpy as np
from tensorflow.keras.models import load_model
import os
import ffmpeg
import dlib
from sklearn.metrics.pairwise import cosine_similarity

app = Flask(__name__)

# Load models at startup
# face_detector = load_model('face_detector.h5') not finished, using dlib for now
face_recognizer = load_model('face_recognizer.h5')

@app.route('/process_video', methods=['POST'])
def process_video():
    video_file = request.files['video']
    faces_not_to_blur = {}
    face_files = request.files.getlist('faces')
    threshold = float(request.form.get('threshold', 0.6))
    blur_amount = int(request.form.get('blur_amount', 30))
    blur_amount = max(1, min(blur_amount, 100))
    
    for file in face_files:
        img = cv2.imdecode(np.frombuffer(file.read(), np.uint8), cv2.IMREAD_COLOR)
        if img is None:
            continue
        grayed = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        faces = detect_faces(img)
        
        for (x, y, w, h) in faces:
            face_crop = grayed[y:y+h, x:x+w]
            
            if face_crop.size == 0:
                continue
            
            face_resized = cv2.resize(face_crop, (128, 128)) / 255.0
            face_resized = np.expand_dims(face_resized, axis=0)
            
            embedding = face_recognizer.predict(face_resized)[0]
            faces_not_to_blur.append(embedding)

    with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as temp_input:
        video_file.save(temp_input.name)
        input_path = temp_input.name
        audio_path = input_path.replace('.mp4', '.wav')

    output_path = input_path.replace('.mp4', '_output.mp4')

    extract_aduio(input_path, audio_path)
    process_and_blur_video(input_path, output_path, faces_not_to_blur, threshold, blur_amount)
    combine_audio_and_video(output_path, audio_path, output_path)
    
    os.remove(input_path)
    os.remove(audio_path)

    return send_file(output_path, mimetype='video/mp4', as_attachment=True)

def process_and_blur_video(input_path, output_path, faces_not_to_blur, threshold=0.6, blur_amount=30):
    cap = cv2.VideoCapture(input_path)
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    fps = cap.get(cv2.CAP_PROP_FPS)
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    out = cv2.VideoWriter(output_path, fourcc, fps, (w, h))

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        # Step 1: Detect all face bounding boxes using your model
        boxes = detect_faces(frame)  # list of (x, y, w, h)
        
        # Step 2: Blur faces that are not in faces_not_to_blur
        for (x, y, w, h) in boxes:
            face_crop = frame[y:y+h, x:x+w]
            
            if face_crop.size == 0:
                continue
            
            highest_confidence = 0
            face_resized = cv2.resize(face_crop, (128, 128)) / 255.0
            face_resized = np.expand_dims(face_resized, axis=0)
            embedding = face_recognizer.predict(face_crop)[0]

            #calculate the similarity between the face and the list of faces not to blur
            for db_embedding in faces_not_to_blur:
                similarity = cosine_similarity([embedding], [db_embedding])[0][0]
                highest_confidence = max(highest_confidence, similarity)
                    
            #blur if the highest confidence is below the threshold
            if highest_confidence > threshold:
                blurred = cv2.GaussianBlur(face_crop, (99, 99), blur_amount)
                frame[y:y+h, x:x+w] = blurred
        # Write frame to output video when the processing is done
        out.write(frame)

    cap.release()
    out.release()

# Example dummy function (you should replace with actual preprocessing + model code)
def detect_faces(frame):
    # tempory face detector using dlib
    detector = dlib.get_frontal_face_detector()
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = detector(gray)
    return [(face.left(), face.top(), face.width(), face.height()) for face in faces]

def extract_aduio(input_video_path, output_audio_path):
    # Extract audio from the original video using FFmpeg
    ffmpeg.input(input_video_path).output(output_audio_path, vn=True).run()
    
def combine_audio_and_video(video_path, audio_path, output_path):
    # Combine the processed video and the extracted audio using FFmpeg
    ffmpeg.input(video_path).input(audio_path).output(output_path, vcodec='copy', acodec='aac').run()

if __name__ == '__main__':
    app.run(debug=True)