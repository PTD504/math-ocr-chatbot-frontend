# Math OCR Chatbot Frontend

---

## Overview

This repository contains the web application for a Math OCR Chatbot. It provides a user-friendly interface where users can upload images of handwritten mathematical equations. The chatbot then sends these images to a dedicated Machine Learning API (hosted separately) for recognition and displays the resulting LaTeX formula back to the user.

## Features

* **Intuitive User Interface:** Simple web interface for image uploads.
* **Real-time LaTeX Display:** Shows the converted LaTeX output instantly.
* **API Integration:** Seamlessly communicates with the `handwritten-math-ocr-api` backend.
* **Client-Server Architecture:** Built with *Update* on the server-side and standard web technologies (HTML, CSS, JavaScript) on the client-side.
* **Dockerized Deployment:** Ready for containerized deployment, ensuring a consistent and isolated environment.

## Architecture

The chatbot operates on a client-server model:
1.  **Client (Browser):** Handles image selection/upload and displays results.
2.  **Server:** Acts as an intermediary, receiving images from the client, forwarding them to the external ML API, and relaying the LaTeX response back to the client.
