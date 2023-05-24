import React, { useState, useRef } from "react";
import "./App.css";

const App: React.FC = () => {
  const [image, setImage] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [resizeWidth, setResizeWidth] = useState<number>(0);
  const [resizeHeight, setResizeHeight] = useState<number>(0);
  const [isEditing, setIsEditing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      console.log(file);
      setImage(file);
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      // Handle the error
    }
  };

  const captureFromCamera = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const file = new File([blob], "captured.jpg");
            setImage(file);
            setPreviewImage(URL.createObjectURL(file));
          }
        },
        "image/jpeg",
        0.8
      );
    }
  };

  const resizeImage = (
    file: File,
    width: number,
    height: number
  ): Promise<Blob> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            resolve(blob as Blob);
          },
          "image/jpeg",
          0.8
        );
      };
    });
  };

  const convertToBlackAndWhite = (imageData: ImageData) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    ctx?.putImageData(imageData, 0, 0);

    const pixels = ctx?.getImageData(0, 0, canvas.width, canvas.height);
    const data = pixels?.data;

    if (data) {
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const brightness = (3 * r + 4 * g + b) >>> 3;
        const contrast = 80;
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
        data[i] =
          data[i + 1] =
          data[i + 2] =
            clamp(factor * (brightness - 128) + 128);
      }

      ctx?.putImageData(pixels, 0, 0);
      const url = canvas.toDataURL("image/jpeg", 0.8);
      setProcessedImage(url);
    }
  };

  const clamp = (value: number) => {
    return Math.max(0, Math.min(Math.round(value), 255));
  };

  const handleEditClick = async () => {
    if (image && resizeWidth > 0 && resizeHeight > 0) {
      const resizedImage = await resizeImage(image, resizeWidth, resizeHeight);
      const imageObjectUrl = URL.createObjectURL(resizedImage);
      const img = new Image();
      img.src = imageObjectUrl;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0);
        const imageData = ctx?.getImageData(0, 0, img.width, img.height);
        if (imageData) {
          convertToBlackAndWhite(imageData);
        }
      };
    }
    setIsEditing(true);
  };

  const handleSendClick = async () => {
    if (processedImage) {
      const convertedImage = dataURLtoFile(processedImage, "converted.jpg");
      sendImageData(convertedImage);
    }
  };

  const dataURLtoFile = (dataUrl: string, filename: string): File => {
    const arr = dataUrl.split(",");
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  const sendImageData = async (imageData: File) => {
    const formData = new FormData();
    formData.append("image", imageData);

    try {
      const response = await fetch("https://your-backend-api-url", {
        method: "POST",
        body: formData,
      });
      if (response.ok) {
        // Handle the successful response
      } else {
        // Handle the error response
      }
    } catch (error) {
      // Handle the network error
    }
  };

  return (
    <div className="container">
      <input type="file" accept="image/*" onChange={handleImageChange} />
      <button onClick={openCamera}>Open Camera</button>
      {previewImage && !isEditing && (
        <div>
          {videoRef.current && (
            <video
              ref={videoRef}
              style={{ display: "block", maxWidth: "300px" }}
              autoPlay
            ></video>
          )}
          <img src={previewImage} alt="Preview" style={{ maxWidth: "300px" }} />
          <div>
            <label>Resize Width:</label>
            <input
              type="number"
              value={resizeWidth}
              onChange={(e) => setResizeWidth(parseInt(e.target.value))}
            />
          </div>
          <div>
            <label>Resize Height:</label>
            <input
              type="number"
              value={resizeHeight}
              onChange={(e) => setResizeHeight(parseInt(e.target.value))}
            />
          </div>
          <button onClick={handleEditClick}>Edit</button>
        </div>
      )}
      {videoRef.current && (
        <button onClick={captureFromCamera}>Capture from Camera</button>
      )}
      {processedImage && isEditing && (
        <div>
          <img
            src={processedImage}
            alt="Processed"
            style={{ maxWidth: "300px" }}
          />
          <button onClick={handleSendClick}>Send</button>
        </div>
      )}
    </div>
  );
};

export default App;
