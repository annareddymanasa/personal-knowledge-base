import { useCallback, useEffect, useState } from "react";
import {
  FileText,
  FileImage,
  FileArchive,
  Upload,
  Download,
  Trash2,
  LoaderCircle,
  Paperclip,
  ShieldAlert,
} from "lucide-react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./NoteAttachments.css";

const API_URL = "http://localhost:5000/api";

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getFileIcon(mimeType) {
  if (mimeType?.startsWith("image/")) {
    return FileImage;
  }

  if (
    mimeType?.includes("word") ||
    mimeType?.includes("spreadsheet") ||
    mimeType?.includes("presentation") ||
    mimeType === "application/pdf"
  ) {
    return FileArchive;
  }

  return FileText;
}

export default function NoteAttachments({ noteId, notify }) {
  const navigate = useNavigate();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [busyDocumentId, setBusyDocumentId] = useState(null);

  const getHeaders = useCallback(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      throw new Error("Your session has expired. Please sign in again.");
    }

    return {
      Authorization: `Bearer ${token}`,
    };
  }, []);

  const handleError = useCallback(
    (error) => {
      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
        return "Your session has expired. Please sign in again.";
      }

      return (
        error.response?.data?.message ||
        error.message ||
        "Something went wrong. Please try again."
      );
    },
    [navigate]
  );

  const loadDocuments = useCallback(async () => {
    if (!noteId) return;

    setLoading(true);
    setError("");

    try {
      const response = await axios.get(
        `${API_URL}/documents/notes/${noteId}`,
        {
          headers: getHeaders(),
        }
      );

      setDocuments(
        Array.isArray(response.data.documents)
          ? response.data.documents
          : []
      );
    } catch (error) {
      setError(handleError(error));
    } finally {
      setLoading(false);
    }
  }, [noteId, getHeaders, handleError]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const uploadFiles = async (event) => {
    const selectedFiles = Array.from(event.target.files || []);

    if (selectedFiles.length === 0) return;

    event.target.value = "";
    setError("");

    if (selectedFiles.length > 5) {
      setError("Select a maximum of five files at a time.");
      return;
    }

    const oversizedFile = selectedFiles.find(
      (file) => file.size > 10 * 1024 * 1024
    );

    if (oversizedFile) {
      setError(
        `${oversizedFile.name} exceeds the 10 MB file size limit.`
      );
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();

      selectedFiles.forEach((file) => {
        formData.append("files", file);
      });

      const response = await axios.post(
        `${API_URL}/documents/notes/${noteId}`,
        formData,
        {
          headers: getHeaders(),
        }
      );

      await loadDocuments();

      notify?.(
        response.data.message || "Files uploaded successfully."
      );
    } catch (error) {
      setError(handleError(error));
    } finally {
      setUploading(false);
    }
  };

  const downloadDocument = async (document) => {
    setBusyDocumentId(document.id);
    setError("");

    try {
      const response = await axios.get(
        `${API_URL}/documents/${document.id}/download`,
        {
          headers: getHeaders(),
          responseType: "blob",
        }
      );

      const blobUrl = URL.createObjectURL(response.data);
      const link = window.document.createElement("a");

      link.href = blobUrl;
      link.download = document.originalName || "attachment";
      window.document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (error) {
      setError(handleError(error));
    } finally {
      setBusyDocumentId(null);
    }
  };

  const deleteDocument = async (document) => {
    const confirmed = window.confirm(
      `Delete "${document.originalName}" permanently?`
    );

    if (!confirmed) return;

    setBusyDocumentId(document.id);
    setError("");

    try {
      const response = await axios.delete(
        `${API_URL}/documents/${document.id}`,
        {
          headers: getHeaders(),
        }
      );

      setDocuments((current) =>
        current.filter((item) => item.id !== document.id)
      );

      notify?.(
        response.data.message || "Attachment deleted successfully."
      );
    } catch (error) {
      setError(handleError(error));
    } finally {
      setBusyDocumentId(null);
    }
  };

  return (
    <section className="pkb-attachments">
      <div className="pkb-attachments-heading">
        <div className="pkb-attachments-title">
          <Paperclip size={17} />
          <div>
            <h3>Attachments</h3>
            <p>
              {documents.length}{" "}
              {documents.length === 1 ? "file" : "files"} attached
            </p>
          </div>
        </div>

        <label
          className={`pkb-attachment-upload ${
            uploading ? "disabled" : ""
          }`}
        >
          {uploading ? (
            <LoaderCircle className="pkb-attachment-spinner" size={16} />
          ) : (
            <Upload size={16} />
          )}

          <span>{uploading ? "Uploading..." : "Attach files"}</span>

          <input
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.txt,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
            disabled={uploading || loading}
            onChange={uploadFiles}
          />
        </label>
      </div>

      <p className="pkb-attachment-hint">
        PDF, images, text, Word, Excel, and PowerPoint files. Maximum 10 MB
        per file and five files per upload.
      </p>

      {error && (
        <div className="pkb-attachment-error">
          <ShieldAlert size={17} />
          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {loading ? (
        <div className="pkb-attachment-loading">
          <LoaderCircle className="pkb-attachment-spinner" size={20} />
          Loading attachments...
        </div>
      ) : documents.length === 0 ? (
        <div className="pkb-attachment-empty">
          <Paperclip size={23} />
          <span>No attachments yet.</span>
          <small>Attach a document or image to this note.</small>
        </div>
      ) : (
        <div className="pkb-attachment-list">
          {documents.map((document) => {
            const FileIcon = getFileIcon(document.mimeType);
            const busy = busyDocumentId === document.id;

            return (
              <article
                className="pkb-attachment-item"
                key={document.id}
              >
                <div className="pkb-attachment-file-icon">
                  <FileIcon size={21} />
                </div>

                <div className="pkb-attachment-file-info">
                  <strong title={document.originalName}>
                    {document.originalName}
                  </strong>

                  <span>
                    {formatFileSize(Number(document.fileSize) || 0)}
                  </span>
                </div>

                <div className="pkb-attachment-actions">
                  <button
                    type="button"
                    title="Download file"
                    aria-label={`Download ${document.originalName}`}
                    disabled={busy}
                    onClick={() => downloadDocument(document)}
                  >
                    {busy ? (
                      <LoaderCircle
                        className="pkb-attachment-spinner"
                        size={17}
                      />
                    ) : (
                      <Download size={17} />
                    )}
                  </button>

                  <button
                    type="button"
                    title="Delete attachment"
                    aria-label={`Delete ${document.originalName}`}
                    disabled={busy}
                    onClick={() => deleteDocument(document)}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}