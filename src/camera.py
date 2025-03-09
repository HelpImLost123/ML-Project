import cv2
import time
import pyaudio
import wave
import os
from datetime import datetime
import av

class VideoRecorder:
    def __init__(self, output_dir="../output", camera_id=0, audio_rate=44100, audio_channels=1, audio_frames_per_buffer=1024):
        self.cap = cv2.VideoCapture(camera_id)
        self.frame_width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        self.frame_height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        self.fps = self.cap.get(cv2.CAP_PROP_FPS) or 30  # Default to 30 FPS if not detected
        
        # Create output directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)
        # Create timestamped filename
        self.timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        self.video_filename = f"{self.timestamp}.mp4"
        self.audio_filename = f"{self.timestamp}.wav"
        self.output_path = os.path.join(output_dir, self.video_filename)
        self.audio_path = os.path.join(output_dir, self.audio_filename)
        self.out = cv2.VideoWriter(self.output_path, cv2.VideoWriter_fourcc(*"mp4v"), self.fps, (self.frame_width, self.frame_height))
        
        if not self.out.isOpened():
            print("[ERROR] Failed to open video writer")
        
        self.stop_flag = False
        self.pause_flag = False

        # Audio recording setup
        self.audio_format = pyaudio.paInt16
        self.channels = audio_channels
        self.rate = audio_rate
        self.chunk = audio_frames_per_buffer
        self.audio = pyaudio.PyAudio()
        self.audio_stream = self.audio.open(format=self.audio_format, channels=self.channels, rate=self.rate, input=True, frames_per_buffer=self.chunk)
        self.audio_frames = []
        self.current_frame = None

    def record(self):
        print("[INFO] Starting recording...")
        while self.cap.isOpened() and not self.stop_flag:
            ret, frame = self.cap.read()
            if not ret or self.stop_flag:
                break

            if not self.pause_flag:
                # Save frame to video
                self.out.write(frame)

                # Capture audio
                audio_data = self.audio_stream.read(self.chunk)
                self.audio_frames.append(audio_data)

            # Display the frame
            # cv2.imshow("Recording", frame)
            self.current_frame = frame

            if cv2.waitKey(1) & 0xFF == ord('q'):
                self.stop_flag = True
                break

        self.stop()

    def stop(self):
        self.stop_flag = True
        print("[INFO] Stopping recording...")
        self.cap.release()
        self.out.release()
        cv2.destroyAllWindows()

        # Stop and save audio
        self.audio_stream.stop_stream()
        self.audio_stream.close()
        self.audio.terminate()
        with wave.open(self.audio_path, 'wb') as wf:
            wf.setnchannels(self.channels)
            wf.setsampwidth(self.audio.get_sample_size(self.audio_format))
            wf.setframerate(self.rate)
            wf.writeframes(b''.join(self.audio_frames))

        print("[INFO] Recording stopped and saved")
        # Combine audio and video using moviepy
        combined_output_path = f"{self.timestamp}_combined.mp4"
        return self.output_path, self.audio_path, combined_output_path

    def pause(self):
        self.pause_flag = True
        print("[INFO] Recording paused")

    def resume(self):
        self.pause_flag = False
        print("[INFO] Recording resumed")
        
    def get_current_frame(self):
        return self.current_frame