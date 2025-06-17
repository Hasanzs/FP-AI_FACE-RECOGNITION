from flask import Flask, request, jsonify, render_template
from deepface import DeepFace
import os
import uuid
import logging

logging.basicConfig(level=logging.INFO)

app = Flask(__name__)
UPLOAD_FOLDER = 'uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

SUPPORTED_MODELS = [
    "VGG-Face",
    "Facenet",
    "Facenet512",
    "OpenFace",
    "DeepFace",
    "DeepID",
    "ArcFace",
    "Dlib",
    "SFace",
]

DETECTOR_BACKENDS = [
    'opencv',
    'ssd',
    'dlib',
    'mtcnn',
    'retinaface',
    'mediapipe'
]

@app.route('/')
def index():
    return render_template('index.html', models=SUPPORTED_MODELS)

@app.route('/predict', methods=['POST'])
def predict():
    if 'image1' not in request.files or 'image2' not in request.files:
        return jsonify({'error': 'Kedua gambar harus diupload'}), 400

    file1 = request.files['image1']
    file2 = request.files['image2']
    model_name = request.form.get('model', 'VGG-Face')
    detector_backend = request.form.get('detector_backend', 'opencv')

    if model_name not in SUPPORTED_MODELS:
        return jsonify({'error': f'Model {model_name} tidak didukung. Pilih dari: {", ".join(SUPPORTED_MODELS)}'}), 400

    if detector_backend not in DETECTOR_BACKENDS:
         return jsonify({'error': f'Detector backend {detector_backend} tidak didukung. Pilih dari: {", ".join(DETECTOR_BACKENDS)}'}), 400

    try:
        filename1 = str(uuid.uuid4()) + os.path.splitext(file1.filename)[1]
        filename2 = str(uuid.uuid4()) + os.path.splitext(file2.filename)[1]
        img1_path = os.path.join(app.config['UPLOAD_FOLDER'], filename1)
        img2_path = os.path.join(app.config['UPLOAD_FOLDER'], filename2)
        file1.save(img1_path)
        file2.save(img2_path)

        logging.info(f"Memverifikasi menggunakan model: {model_name}, detector: {detector_backend}")
    
        result = DeepFace.verify(
            img1_path=img1_path,
            img2_path=img2_path,
            model_name=model_name,
            detector_backend=detector_backend,
            enforce_detection=True
        )
        logging.info(f"Hasil verifikasi: {result}")

        os.remove(img1_path)
        os.remove(img2_path)

        response_data = {
            'verified': result.get('verified', False),
            'distance': result.get('distance', -1.0),
            'threshold': result.get('threshold', -1.0),
            'model': result.get('model', model_name),
            'similarity_percent': (1 - result.get('distance', 1.0)) * 100 if result.get('distance', 1.0) >=0 else 0,
            'facial_areas': { 
                'img1': result.get('facial_areas', {}).get('img1'),
                'img2': result.get('facial_areas', {}).get('img2')
            },
            'time': result.get('time', -1.0)
        }
        return jsonify(response_data)

    except ValueError as ve: 
        logging.error(f"ValueError: {ve}")
    
        if os.path.exists(img1_path): os.remove(img1_path)
        if os.path.exists(img2_path): os.remove(img2_path)
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        logging.error(f"Exception: {e}")
    
        if os.path.exists(img1_path): os.remove(img1_path)
        if os.path.exists(img2_path): os.remove(img2_path)
        return jsonify({'error': f'Terjadi kesalahan internal: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True) 


# How to run!
    # python3 -m venv venv
    # source venv/bin/activate
    # python3 app.py
