document.addEventListener('DOMContentLoaded', () => {
    const image1Upload = document.getElementById('image1-upload');
    const image1Preview = document.getElementById('image1-preview');
    const video1 = document.getElementById('video1');
    const camera1Btn = document.getElementById('camera1-btn');
    const capture1Btn = document.getElementById('capture1-btn');

    const image2Upload = document.getElementById('image2-upload');
    const image2Preview = document.getElementById('image2-preview');
    const video2 = document.getElementById('video2');
    const camera2Btn = document.getElementById('camera2-btn');
    const capture2Btn = document.getElementById('capture2-btn');

    const modelSelect = document.getElementById('model-select');
    const predictBtn = document.getElementById('predict-btn');
    const resultText = document.getElementById('result-text');
    const loader = document.getElementById('loader');

    let image1File, image2File;
    let stream1, stream2;

    // Function to handle image preview from file input
    function previewImage(file, previewElement) {
        if (file) {
            previewElement.src = URL.createObjectURL(file);
            previewElement.style.display = 'block';
        } else {
            previewElement.src = '#'; // Reset src
            previewElement.style.display = 'none';
        }
    }

    image1Upload.addEventListener('change', (event) => {
        image1File = event.target.files[0];
        previewImage(image1File, image1Preview);
        if (stream1) stopStream(stream1, video1, capture1Btn); // Stop camera if file is chosen
        video1.style.display = 'none'; // Hide video element
    });

    image2Upload.addEventListener('change', (event) => {
        image2File = event.target.files[0];
        previewImage(image2File, image2Preview);
        if (stream2) stopStream(stream2, video2, capture2Btn); // Stop camera if file is chosen
        video2.style.display = 'none'; // Hide video element
    });

    // Function to start camera stream
    async function startCamera(videoElement, captureButton, streamVarSetter, imagePreviewElement, imageFileSetter) {
        try {
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                streamVarSetter(stream);
                videoElement.srcObject = stream;
                videoElement.style.display = 'block';
                captureButton.style.display = 'inline-block'; // Show capture button
                imagePreviewElement.style.display = 'none'; // Hide image preview
                imageFileSetter(null); // Clear any selected file
                if (imagePreviewElement.id === 'image1-preview') image1Upload.value = ''; // Clear file input
                if (imagePreviewElement.id === 'image2-preview') image2Upload.value = ''; // Clear file input
            } else {
                alert('Camera not supported by this browser.');
            }
        } catch (error) {
            console.error('Error accessing camera:', error);
            alert('Error accessing camera. Please ensure permissions are granted.');
        }
    }

    // Function to stop camera stream
    function stopStream(stream, videoElement, captureButton) {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        videoElement.srcObject = null;
        videoElement.style.display = 'none';
        captureButton.style.display = 'none';
    }

    // Function to capture image from video stream
    function captureImage(videoElement, previewElement, imageFileSetter, streamVar, captureButton) {
        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        const context = canvas.getContext('2d');
        context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob(blob => {
            const file = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
            imageFileSetter(file);
            previewImage(file, previewElement);
            stopStream(streamVar, videoElement, captureButton);
        }, 'image/jpeg');
    }

    camera1Btn.addEventListener('click', () => {
        startCamera(video1, capture1Btn, (s) => stream1 = s, image1Preview, (f) => image1File = f);
    });
    capture1Btn.addEventListener('click', () => {
        captureImage(video1, image1Preview, (f) => image1File = f, stream1, capture1Btn);
    });

    camera2Btn.addEventListener('click', () => {
        startCamera(video2, capture2Btn, (s) => stream2 = s, image2Preview, (f) => image2File = f);
    });
    capture2Btn.addEventListener('click', () => {
        captureImage(video2, image2Preview, (f) => image2File = f, stream2, capture2Btn);
    });


    // Prediction logic
    predictBtn.addEventListener('click', async () => {
        if (!image1File || !image2File) {
            alert('Please upload or capture both images first.');
            return;
        }

        const formData = new FormData();
        formData.append('image1', image1File);
        formData.append('image2', image2File);
        formData.append('model', modelSelect.value);
        // formData.append('detector_backend', document.getElementById('detector-select').value); // Uncomment if detector_backend is used

        loader.style.display = 'block';
        resultText.textContent = 'Processing...'; // This will be in English, if you want Indonesian: "Memproses..."

        try {
            const response = await fetch('/predict', {
                method: 'POST',
                body: formData,
            });

            loader.style.display = 'none';
            const data = await response.json();

            if (response.ok) {
                const distance = data.distance;
                const threshold = data.threshold; // Ensure your backend sends this value
                let similarityText = 'N/A (Threshold tidak tersedia)'; // "N/A (Threshold not available)"

                if (typeof threshold === 'number' && threshold > 0) {
                    // Calculate similarity: 100% if distance is 0, 50% if distance is threshold, 0% if distance is 2*threshold or more.
                    let percentage = Math.max(0, 100 * (1 - distance / (threshold * 2)));
                    similarityText = `${percentage.toFixed(2)}%`;
                } else {
                    console.warn("Threshold is not available from the backend or is invalid. Cannot calculate similarity percentage.");
                }

                resultText.innerHTML = `Hasil Verifikasi: ${data.verified ? 'Terverifikasi' : 'Tidak Terverifikasi'}<br>
                                        Persentase Kemiripan: ${similarityText}<br>
                                        Jarak: ${distance.toFixed(4)}<br>
                                        Model: ${data.model}`;
            } else {
                resultText.textContent = `Error: ${data.error || 'An error occurred during prediction.'}`; // Or in Indonesian: "Terjadi kesalahan saat prediksi."
            }
        } catch (error) {
            loader.style.display = 'none';
            resultText.textContent = `Error: ${error.message}`;
            console.error('Error during prediction:', error);
        }
    });
});
