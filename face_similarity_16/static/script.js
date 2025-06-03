document.addEventListener('DOMContentLoaded', () => {
    const image1Upload = document.getElementById('image1-upload');
    const image1Preview = document.getElementById('image1-preview');
    const camera1Btn = document.getElementById('camera1-btn');
    const video1El = document.getElementById('video1');
    const capture1Btn = document.getElementById('capture1-btn');
    let stream1 = null;
    let image1File = null; // Untuk menyimpan file dari upload atau capture

    const image2Upload = document.getElementById('image2-upload');
    const image2Preview = document.getElementById('image2-preview');
    const camera2Btn = document.getElementById('camera2-btn');
    const video2El = document.getElementById('video2');
    const capture2Btn = document.getElementById('capture2-btn');
    let stream2 = null;
    let image2File = null; // Untuk menyimpan file dari upload atau capture

    const predictBtn = document.getElementById('predict-btn');
    const resultText = document.getElementById('result-text');
    const modelSelect = document.getElementById('model-select');
    const loader = document.getElementById('loader');

    // Fungsi untuk menampilkan preview gambar dari file input
    function setupImageUpload(uploadElement, previewElement, fileVarSetter) {
        uploadElement.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                fileVarSetter(file); // Simpan file object
                const reader = new FileReader();
                reader.onload = (e) => {
                    previewElement.src = e.target.result;
                    previewElement.style.display = 'block';
                }
                reader.readAsDataURL(file);
            }
        });
    }

    setupImageUpload(image1Upload, image1Preview, (file) => image1File = file);
    setupImageUpload(image2Upload, image2Preview, (file) => image2File = file);

    // Fungsi untuk setup kamera
    function setupCamera(cameraBtn, videoEl, captureBtn, previewEl, streamVar, fileVarSetter) {
        cameraBtn.addEventListener('click', async () => {
            if (streamVar) { // Jika stream sudah ada, matikan
                streamVar.getTracks().forEach(track => track.stop());
                videoEl.style.display = 'none';
                captureBtn.style.display = 'none';
                cameraBtn.textContent = `Ambil dari Kamera ${videoEl.id.slice(-1)}`;
                streamVar = null;
                return;
            }
            try {
                streamVar = await navigator.mediaDevices.getUserMedia({ video: true });
                videoEl.srcObject = streamVar;
                videoEl.style.display = 'block';
                previewEl.style.display = 'none'; // Sembunyikan preview file jika kamera aktif
                captureBtn.style.display = 'inline-block';
                cameraBtn.textContent = `Tutup Kamera ${videoEl.id.slice(-1)}`;
            } catch (err) {
                console.error("Error accessing camera: ", err);
                resultText.textContent = `Error: Tidak bisa mengakses kamera. ${err.message}`;
                alert("Tidak bisa mengakses kamera. Pastikan Anda memberikan izin.");
            }
        });

        captureBtn.addEventListener('click', () => {
            if (streamVar) {
                const canvas = document.createElement('canvas');
                canvas.width = videoEl.videoWidth;
                canvas.height = videoEl.videoHeight;
                const context = canvas.getContext('2d');
                context.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

                previewEl.src = canvas.toDataURL('image/jpeg'); // Tampilkan di preview
                previewEl.style.display = 'block';

                // Konversi canvas ke Blob lalu ke File object
                canvas.toBlob((blob) => {
                    const capturedFile = new File([blob], `capture_${videoEl.id}.jpg`, { type: 'image/jpeg' });
                    fileVarSetter(capturedFile); // Simpan file object
                }, 'image/jpeg');


                // Opsional: matikan kamera setelah capture
                // streamVar.getTracks().forEach(track => track.stop());
                // videoEl.style.display = 'none';
                // captureBtn.style.display = 'none';
                // cameraBtn.textContent = `Ambil dari Kamera ${videoEl.id.slice(-1)}`;
                // streamVar = null;
            }
        });
    }

    setupCamera(camera1Btn, video1El, capture1Btn, image1Preview, stream1, (file) => image1File = file);
    setupCamera(camera2Btn, video2El, capture2Btn, image2Preview, stream2, (file) => image2File = file);


    // Tombol Prediksi
    predictBtn.addEventListener('click', async () => {
        if (!image1File || !image2File) {
            resultText.textContent = 'Error: Silakan pilih atau ambil kedua gambar terlebih dahulu.';
            return;
        }

        const formData = new FormData();
        formData.append('image1', image1File);
        formData.append('image2', image2File);
        formData.append('model', modelSelect.value);
        // Anda bisa menambahkan pilihan detector_backend di HTML dan mengirimnya juga
        // formData.append('detector_backend', 'mtcnn');

        resultText.textContent = 'Memproses...';
        loader.style.display = 'block';
        predictBtn.disabled = true;

        try {
            const response = await fetch('/predict', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                let output = `Model: ${data.model}<br>`;
                output += `Terverifikasi: ${data.verified ? 'YA' : 'TIDAK'}<br>`;
                output += `Jarak: ${data.distance.toFixed(4)} (Threshold: ${data.threshold.toFixed(4)})<br>`;
                output += `Persentase Similaritas (estimasi): ${data.similarity_percent.toFixed(2)}%<br>`;
                if (data.time) output += `Waktu Proses: ${data.time.toFixed(2)} detik<br>`;
                if (data.facial_areas && data.facial_areas.img1) {
                    output += `Area Wajah Gbr 1: x=${data.facial_areas.img1.x}, y=${data.facial_areas.img1.y}, w=${data.facial_areas.img1.w}, h=${data.facial_areas.img1.h}<br>`;
                }
                 if (data.facial_areas && data.facial_areas.img2) {
                    output += `Area Wajah Gbr 2: x=${data.facial_areas.img2.x}, y=${data.facial_areas.img2.y}, w=${data.facial_areas.img2.w}, h=${data.facial_areas.img2.h}<br>`;
                }
                resultText.innerHTML = output;
            } else {
                resultText.textContent = `Error: ${data.error || 'Gagal melakukan prediksi.'}`;
            }
        } catch (error) {
            console.error('Error during prediction:', error);
            resultText.textContent = `Error: Terjadi masalah koneksi atau server. ${error.message}`;
        } finally {
            loader.style.display = 'none';
            predictBtn.disabled = false;
        }
    });
});