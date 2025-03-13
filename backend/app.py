from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import tempfile
import cv2
import numpy as np
from tensorflow.keras.models import load_model
import os
import json
import ffmpeg
import dlib
from sklearn.metrics.pairwise import cosine_similarity
import subprocess
from concurrent.futures import ThreadPoolExecutor, as_completed
import queue
import time

app = Flask(__name__)
CORS(app)

# Load models at startup
# face_detector = load_model('backend/face_detector.h5') not finished, using dlib for now
face_recognizer = load_model('backend/face_recognizer.h5')
# face_recognizer = load_model('backend/best_model2.h5')
@app.route('/dummy_video', methods=['POST'])
def dummy_video():
    print("Received dummy video request")
    try:
        uploads_dir = os.path.join(os.getcwd(), 'uploads')
        output_file = os.path.join(uploads_dir, 'output_1741882856.mp4')
        
        if not os.path.exists(output_file):
            return jsonify({"error": "File not found"}), 404
        print(f"Sending file: {output_file}")
        return send_file(output_file, mimetype='video/mp4')
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/process_video', methods=['POST'])
def process_video():
    start_time = time.time()  # Start the timer
    try:
        video_file = request.files['video']
        threshold = float(request.form.get('threshold', 0.6))
        blur_amount = int(request.form.get('blur_amount', 30))
        blur_amount = max(1, min(blur_amount, 100))
        faces_not_to_blur = []
        for key in request.files:
            if key.startswith('face_image_'):
                file = request.files[key]
                img = cv2.imdecode(np.frombuffer(file.read(), np.uint8), cv2.IMREAD_COLOR)
                # grayed = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
                faces = detect_faces(img)
                
                for (x, y, w, h) in faces:
                    face_crop = img[y:y+h, x:x+w]
                    
                    if face_crop.size == 0:
                        continue
                    
                    face_resized = cv2.resize(face_crop, (128, 128)) / 255.0
                    face_resized = np.expand_dims(face_resized, axis=0)
                    
                    embedding = face_recognizer.predict(face_resized)[0]
                    print(f"Embedding shape: {embedding.shape}")
                    print(f"Embedding: {embedding}")
                    faces_not_to_blur.append(embedding)
        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as temp_input:
            video_file.save(temp_input.name)
            input_path = temp_input.name
            # audio_path = input_path.replace('.mp4', '.wav')
            # final_path = input_path.replace('.mp4', '_final.mp4')
        # Ensure the uploads directory exists

        uploads_dir = os.path.join(os.getcwd(), 'uploads')
        if not os.path.exists(uploads_dir):
            os.makedirs(uploads_dir)
            print(f"Created uploads directory at {uploads_dir}")

        timestamp = str(int(time.time()))
        output_path = os.path.join(uploads_dir, f'output_{timestamp}.mp4')
        print(f"Output path: {output_path}")
        # extract_audio(input_path, audio_path)
        process_and_blur_video(input_path, output_path, faces_not_to_blur, threshold, blur_amount)
        # combine_audio_video(output_path, audio_path, final_path)
        
        os.remove(input_path)
        # os.remove(audio_path)
        
        end_time = time.time()  # End the timer
        elapsed_time = end_time - start_time
        print(f"Total processing time: {elapsed_time:.2f} seconds")

        return send_file(output_path, mimetype='video/mp4', as_attachment=True)
    except Exception as e:
        print(f"Error processing video: {e}")
        return jsonify({"error": str(e)}), 500
    
@app.route('/process_image', methods=['POST'])
def process_image():
    starttime = time.time()
    try:
        picture_file = request.files['image']
        threshold = float(request.form.get('threshold', 0.6))
        blur_amount = int(request.form.get('blur_amount', 30))
        blur_amount = max(1, min(blur_amount, 100))
        faces_not_to_blur = []
        for key in request.files:
            if key.startswith('face_image_'):
                file = request.files[key]
                img = cv2.imdecode(np.frombuffer(file.read(), np.uint8), cv2.IMREAD_COLOR)
                # grayed = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
                faces = detect_faces(img)
                
                for (x, y, w, h) in faces:
                    face_crop = img[y:y+h, x:x+w]
                    
                    if face_crop.size == 0:
                        continue
                    
                    face_resized = cv2.resize(face_crop, (128, 128)) / 255.0
                    face_resized = np.expand_dims(face_resized, axis=0)
                    
                    embedding = face_recognizer.predict(face_resized)[0]
                    print(f"Embedding shape: {embedding.shape}")
                    print(f"Embedding: {embedding}")
                    faces_not_to_blur.append(embedding)
        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as temp_input:
            picture_file.save(temp_input.name)
            input_path = temp_input.name
            
            uploads_dir = os.path.join(os.getcwd(), 'uploads')
            if not os.path.exists(uploads_dir):
                os.makedirs(uploads_dir)
                print(f"Created uploads directory at {uploads_dir}")

        timestamp = str(int(time.time()))
        output_path = os.path.join(os.getcwd(), 'uploads', f'output_{timestamp}.jpg')
        process_and_blur_picture(input_path, output_path, faces_not_to_blur, threshold, blur_amount)
        os.remove(input_path)
        endtime = time.time()
        elapsed_time = endtime - starttime
        print(f"Total processing time: {elapsed_time:.2f} seconds")
        return send_file(output_path, mimetype='image/jpg', as_attachment=True)
    except Exception as e:
        print(f"Error processing picture: {e}")
        return jsonify({"error": str(e)}), 500

def process_and_blur_picture(input_path, output_path, faces_not_to_blur, threshold=0.6, blur_amount=30):
    img = cv2.imread(input_path)
    boxes = detect_faces(img)
    print(f"Detected {len(boxes)} faces")
    for (x, y, w, h) in boxes:
        face_crop = img[y:y+h, x:x+w]
        
        if face_crop.size == 0:
            continue
        
        highest_confidence = 0
        face_resized = cv2.resize(face_crop, (128, 128)) / 255.0
        face_resized = np.expand_dims(face_resized, axis=0)
        embedding = face_recognizer.predict(face_resized)[0]

        # Calculate the similarity between the face and the list of faces not to blur
        for db_embedding in faces_not_to_blur:
            similarity = cosine_similarity([embedding], [db_embedding])[0][0]
            highest_confidence = max(highest_confidence, similarity)
        print(f"Highest confidence: {highest_confidence}")
                
        # Blur if the highest confidence is below the threshold
        if highest_confidence < threshold:
            blurred = cv2.GaussianBlur(face_crop, (99, 99), blur_amount)
            img[y:y+h, x:x+w] = blurred
    cv2.imwrite(output_path, img)
    print(f"Picture processed and saved to {output_path}")
    
    if not os.path.exists(output_path):
        raise Exception(f"Output picture file was not created: {output_path}")

def process_and_blur_video(input_path, output_path, faces_not_to_blur, threshold=0.6, blur_amount=30):
    cap = cv2.VideoCapture(input_path)
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    fps = cap.get(cv2.CAP_PROP_FPS)
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    out = cv2.VideoWriter(output_path, fourcc, fps, (w, h))

    if not out.isOpened():
        raise Exception(f"Failed to open VideoWriter for output path: {output_path}")

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        # Step 1: Detect all face bounding boxes using your model
        # grayed = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        boxes = detect_faces(frame)  # list of (x, y, w, h)
        print(f"Detected {len(boxes)} faces")
        # Step 2: Blur faces that are not in faces_not_to_blur
        for (x, y, w, h) in boxes:
            face_crop = frame[y:y+h, x:x+w]
            
            if face_crop.size == 0:
                continue
            
            highest_confidence = 0
            face_resized = cv2.resize(face_crop, (128, 128)) / 255.0
            face_resized = np.expand_dims(face_resized, axis=0)
            embedding = face_recognizer.predict(face_resized)[0]

            # Calculate the similarity between the face and the list of faces not to blur
            for db_embedding in faces_not_to_blur:
                similarity = cosine_similarity([embedding], [db_embedding])[0][0]
                highest_confidence = max(highest_confidence, similarity)
            print(f"Highest confidence: {highest_confidence}")
                    
            # Blur if the highest confidence is below the threshold
            if highest_confidence < threshold:
                blurred = cv2.GaussianBlur(face_crop, (99, 99), blur_amount)
                frame[y:y+h, x:x+w] = blurred
        # Write frame to output video when the processing is done
        out.write(frame)

    cap.release()
    out.release()
    
    print(f"Video processed and saved to {output_path}")
    
    if not os.path.exists(output_path):
        raise Exception(f"Output video file was not created: {output_path}")

# Example dummy function (you should replace with actual preprocessing + model code)
def detect_faces(frame):
    # Temporary face detector using dlib
    detector = dlib.get_frontal_face_detector()
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = detector(gray)
    return [(face.left(), face.top(), face.width(), face.height()) for face in faces]

def extract_audio(video_path, output_audio_path):
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Video file not found: {video_path}")

    # Build ffmpeg command
    command = [
        'ffmpeg',
        '-i', video_path,           # input file
        '-vn',                      # disable video
        '-acodec', 'copy',          # copy the audio codec (no re-encoding)
        output_audio_path
    ]

    try:
        subprocess.run(command, check=True)
        print(f"Audio extracted successfully to {output_audio_path}")
    except subprocess.CalledProcessError as e:
        print(f"Failed to extract audio: {e}")
    
def combine_audio_video(video_path, audio_path, output_path):
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Video file not found: {video_path}")
    if not os.path.exists(audio_path):
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    command = [
        'ffmpeg',
        '-i', video_path,
        '-i', audio_path,
        '-c:v', 'copy',        # Copy video without re-encoding
        '-c:a', 'aac',         # Encode audio as AAC (for .mp4)
        '-strict', 'experimental',
        '-shortest',           # Stop when the shorter stream ends
        output_path
    ]

    try:
        subprocess.run(command, check=True)
        print(f"Successfully combined into {output_path}")
    except subprocess.CalledProcessError as e:
        print(f"Failed to combine audio and video: {e}")

if __name__ == '__main__':
    app.run(debug=True)