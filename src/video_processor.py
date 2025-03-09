import cv2
from model_processor import FaceBlurProcessor
import av

class VideoProcessor:
    def __init__(self, input_path, output_path="../output/processed_video.mp4"):
        self.input_path = input_path
        self.output_path = output_path
        self.processor = FaceBlurProcessor(skip_frames=5)
        
    def __init__(self):
        self.processor = FaceBlurProcessor(skip_frames=5)

    def process_video(self):
        cap = cv2.VideoCapture(self.input_path)
        frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = cap.get(cv2.CAP_PROP_FPS) or 30  # Default to 30 FPS if not detected

        out = cv2.VideoWriter(self.output_path, cv2.VideoWriter_fourcc(*"mp4v"), fps, (frame_width, frame_height))

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            processed_frame = self.processor.process_frame(frame)

            # Display FPS on frame
            cv2.putText(processed_frame, f"FPS: {fps:.2f}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
            # Show live feed
            cv2.imshow("Processed Video", processed_frame)

            # Save frame to video
            out.write(processed_frame)

            if cv2.waitKey(1) & 0xFF == ord('q'):
                break

        cap.release()
        out.release()
        cv2.destroyAllWindows()
        
    def combine_audio_video(self, video_path, audio_path, output_path):
        # Open video and audio inputs
        video_input = av.open(video_path)
        audio_input = av.open(audio_path)
        
        # Open the output file for writing
        output = av.open(output_path, 'w')
        
        # Add video and audio streams to the output file
        video_stream = output.add_stream(template=video_input.streams.video[0])
        audio_stream = output.add_stream(template=audio_input.streams.audio[0])
        
        # Calculate timestamps based on frame rates
        video_pts = 0
        audio_pts = 0
        video_rate = 1 / video_input.streams.video[0].average_rate
        audio_rate = 1 / audio_input.streams.audio[0].rate

        # Decode and mux video and audio frames
        for video_frame in video_input.decode(video=0):
            # Set video frame timestamps
            video_frame.pts = video_pts
            video_pts += video_rate
            output.mux(video_frame)
        
        for audio_frame in audio_input.decode(audio=0):
            # Set audio frame timestamps
            audio_frame.pts = audio_pts
            audio_pts += audio_rate
            output.mux(audio_frame)
        
        print(f"[INFO] Combined video saved to {output_path}")
        # Close the output file
        output.close()