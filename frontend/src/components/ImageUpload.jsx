import { useState } from "react";

export default function ImageUpload({ onUpload }) {
    const [file, setFile] = useState(null);

    const handleFileChange = (e) => {
    const uploadedFile = e.target.files[0];
    setFile(uploadedFile);
    onUpload(uploadedFile);
    };

    return (
    <div>
        <input type="file" onChange={handleFileChange} />
        {file && <p>{file.name}</p>}
    </div>
    );
}