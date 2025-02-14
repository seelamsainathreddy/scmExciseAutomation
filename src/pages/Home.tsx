import { useNavigate } from "react-router-dom";
import { useState } from "react";

const Home = () => {
    const [file, setFile] = useState<File | null>(null);
    const navigate = useNavigate();

    const handleUpload = async () => {
        if (!file) return; // Ensure a file is selected
    
        const formData = new FormData();
        formData.append("file", file); // Append the file to FormData
    
        try {
          const response = await fetch("http://127.0.0.1:5001/upload", { // Update with your Flask endpoint
            method: "POST",
            body: formData,
          });
    
          if (response.ok) {
            const data = await response.json(); // Get the response data
            console.log("File uploaded successfully", data);
            navigate('/mapper', { state: { responseData: data, fileName: file.name.split('.')[0] } }); // Redirect to /mapper with response data and file name without extension
          } else {
            console.error("File upload failed");
          }
        } catch (error) {
          console.error("Error uploading file:", error);
        }
      };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
          setFile(event.target.files[0]); // Set the selected file
        }
      };

  return (
    <div>
    <h2>Upload a ZIP file</h2>
    <input type="file" accept=".zip" onChange={handleFileChange} />
    <button onClick={handleUpload}>Upload</button>
  </div>
  )
}

export default Home