# filepath: c:\Users\Win10\Desktop\= _ =\School\ML-Project\Dockerfile
FROM node:14-alpine

WORKDIR /app

# Install http-server
RUN npm install -g http-server

# Copy the frontend files to the container
COPY index.html blur.css blur.js /app/

# Expose port 8080
EXPOSE 8080

# Start http-server
CMD ["http-server", "-p", "8080", "-c-1", "--push-state"]