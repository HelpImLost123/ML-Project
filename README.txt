# Face Blur Application
## Prerequisites

Before you begin, ensure you have met the following requirements:

- You have installed Python 3.7 or later.
- You have installed `pip` (Python package installer).

## Installation

1. **Clone the repository:**

    ```sh
    git clone https://github.com/HelpImLost123/ML-Project.git
    cd ML-PROJECT
    ```

2. **Create a virtual environment:**

    ```sh
    python -m venv venv
    ```

3. **Activate the virtual environment:**

    - On Windows:

        ```sh
        venv\Scripts\activate
        ```

    - On macOS/Linux:

        ```sh
        source venv/bin/activate
        ```

4. **Install the required dependencies:**

    ```sh
    pip install -r requirements.txt
    ```

## Dependencies

The required dependencies are listed in the [requirements.txt](http://_vscodecontentref_/0) file. Here are the main packages used in this project:

- `opencv-python`: For video processing.
- `pyaudio`: For audio recording.
- `Pillow`: For image processing in the Tkinter GUI.
- `av`: For combining audio and video.

## Usage

1. **Run the application:**

    ```sh
    python src/main.py
    ```
