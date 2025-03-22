# ML-Project

## Prerequisites

- Docker
- Python 3.11
- Node.js (for running the frontend)
- CMake (for installing DLibs)
- libgl1
- libglib2.0-0
- in rq.txt

### For running the backend pyton code

gunicorn --bind 0.0.0.0:5000 app:app --timeout 12000 --workers 4

Installing the dependencies
```
cd backend

create the python virtual environment
python -m venv venv

Activate python virtual environment

On Windows:
venv\Scripts\activate

On macOS and Linux:
source venv/bin/activate

installing python requirements
pip install -r rq.txt

### Pull Docker Images

To pull the Docker images from Docker Hub, run the following commands:

```sh
docker pull toodumbforthis/67-ml-project:frontend
docker pull toodumbforthis/67-ml-project:backend

Build the Docker Images locally

```sh
docker-compose build

Run the Docker Containers

docker-compose up

or

docker run -d -p 5000:5000 toodumbforthis/67-ml-project:backend
docker run -d -p 8080:8080 toodumbforthis/67-ml-project:frontend

Access the Application
- The backend service will be available at http://localhost:5000
- The frontend service will be available at http://localhost:8080

If using Docker images the output will be in the backend image files
