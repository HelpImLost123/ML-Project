import tkinter as tk
from tkinter import filedialog, messagebox
from camera import VideoRecorder
from video_processor import VideoProcessor
from PIL import Image, ImageTk
import threading
import cv2

class MainMenuApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Face Blur Application")

        self.main_frame = tk.Frame(root)
        self.main_frame.pack(fill="both", expand=True)

        self.live_button = tk.Button(self.main_frame, text="Live Recording", command=self.start_live_recording)
        self.live_button.pack(pady=10)

        self.file_button = tk.Button(self.main_frame, text="Process Existing Video", command=self.process_existing_video)
        self.file_button.pack(pady=10)

        self.live_frame = tk.Frame(root)
        self.canvas = tk.Canvas(self.live_frame)
        self.canvas.pack(fill="both", expand=True)

        self.back_button = tk.Button(self.live_frame, text="Back", command=self.return_main_menu)
        self.back_button.pack(pady=10)

    def return_main_menu(self):
        self.camera.stop()
        self.live_frame.pack_forget()
        self.main_frame.pack(fill="both", expand=True)

    def start_live_recording(self):
        self.main_frame.pack_forget()
        self.live_frame.pack(fill="both", expand=True)
        self.camera = VideoRecorder()
        self.camera_thread = threading.Thread(target=self.camera.record)
        self.camera_thread.start()
        self.update_live_feed()
        messagebox.showinfo("Info", "Live recording started. Press 'q' in the video window to stop.")

    def update_live_feed(self):
        if not self.camera.stop_flag:
            frame = self.camera.get_current_frame()
            if frame is not None:
                image = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
                image = ImageTk.PhotoImage(image)
                self.canvas.create_image(0, 0, anchor=tk.NW, image=image)
                self.canvas.image = image
            self.root.after(10, self.update_live_feed)

    def check_camera_stop(self):
        if self.camera.stop_flag:
            # video, audio, final = self.camera.stop()
            self.camera.stop()
            messagebox.showinfo("Info", "Live recording stopped.")
            # processor = VideoProcessor()
            # processor.combine_audio_video(video, audio, final)
            self.camera_thread.join()
            self.return_main_menu()

    def process_existing_video(self):
        file_path = filedialog.askopenfilename(filetypes=[("Video files", "*.mp4;*.avi")])
        if file_path:
            self.processor = VideoProcessor(file_path)
            self.processor.process_video()
            messagebox.showinfo("Info", "Video processing completed.")

if __name__ == "__main__":
    root = tk.Tk()
    app = MainMenuApp(root)
    root.mainloop()