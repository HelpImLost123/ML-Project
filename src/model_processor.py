import cv2
import random

class FaceBlurProcessor:
    def __init__(self, skip_frames=5):
        self.skip_frames = skip_frames
        self.current_frame = 0
        self.faces = []

    def detect_faces(self, frame):
        """Generate random bounding boxes as dummy face detection"""
        num_faces = random.randint(1, 5)
        faces = []
        for _ in range(num_faces):
            x = random.randint(0, frame.shape[1] - 50)
            y = random.randint(0, frame.shape[0] - 50)
            w = random.randint(30, 100)
            h = random.randint(30, 100)
            faces.append((x, y, w, h))
        return faces

    def blur_faces(self, frame, faces):
        """Apply Gaussian blur to detected faces"""
        for (x, y, w, h) in faces:
            x, y, w, h = int(x), int(y), int(w), int(h)
            face = frame[y:y+h, x:x+w]
            blurred = cv2.GaussianBlur(face, (99, 99), 30)
            frame[y:y+h, x:x+w] = blurred
        return frame

    def process_frame(self, frame):
        """Detect and blur faces in the frame"""
        if self.current_frame % self.skip_frames == 0:
            self.faces = self.detect_faces(frame)
        frame = self.blur_faces(frame, self.faces)
        self.current_frame += 1
        return frame