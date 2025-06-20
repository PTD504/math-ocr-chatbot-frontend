import { useState, useRef, useEffect } from "react";
import { BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
import "./App.css";
import axios from "axios";

function App() {
  const [messages, setMessages] = useState([]);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasUploaded, setHasUploaded] = useState(false);
  const chatContainer = useRef(null);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    setFile(selectedFile);
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      // Gửi yêu cầu tới endpoint /predict của FastAPI
      const response = await axios.post(
        "http://192.168.28.32:8000/predict",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setMessages((prevMessages) => [
        ...prevMessages,
        { type: "user", preview: previewUrl, id: `user-${Date.now()}` },
        {
          type: "bot",
          latex: response.data.formula || "\\text{Không có công thức}",
          id: `bot-${Date.now() + 1}`,
        },
      ]);
    } catch (error) {
      console.error("Lỗi khi gửi yêu cầu tới API:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      let errorMessage =
        "\\text{Đã xảy ra lỗi khi xử lý yêu cầu. Vui lòng thử lại.}";
      if (error.response?.status === 422) {
        errorMessage =
          "\\text{Lỗi: Trường file không hợp lệ. Vui lòng kiểm tra định dạng ảnh.}";
      } else if (error.response?.status === 500) {
        errorMessage = "\\text{Lỗi server. Vui lòng liên hệ đội backend.}";
      }
      setMessages((prevMessages) => [
        ...prevMessages,
        { type: "user", preview: previewUrl, id: `user-${Date.now()}` },
        {
          type: "bot",
          latex: errorMessage,
          id: `bot-${Date.now() + 1}`,
        },
      ]);
    } finally {
      setFile(null);
      setPreviewUrl(null);
      setIsLoading(false);
      setHasUploaded(true);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && file && !isLoading) {
      handleUpload();
    }
  };

  useEffect(() => {
    if (chatContainer.current) {
      chatContainer.current.scrollTop = chatContainer.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    console.log("Messages updated:", messages);
  }, [messages]);

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#181818] text-[#e5e7eb] overflow-x-hidden">
      {/* Tiêu đề */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-[#2c2c2c] w-full">
        <div className="flex items-center space-x-2">
          <svg
            viewBox="0 0 120 120"
            className="w-6 h-6"
            aria-hidden="true"
            focusable="false"
          >
            <rect
              x="10"
              y="10"
              width="100"
              height="100"
              rx="15"
              ry="15"
              fill="#2c2c2c"
              stroke="#e5e7eb"
              strokeWidth="5"
            />
            <line
              className="scanner-lines"
              x1="20"
              y1="40"
              x2="100"
              y2="40"
              stroke="#e5e7eb"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="20 15"
            />
            <line
              className="scanner-lines"
              x1="20"
              y1="60"
              x2="100"
              y2="60"
              stroke="#e5e7eb"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="20 15"
            />
            <line
              className="scanner-lines"
              x1="20"
              y1="80"
              x2="100"
              y2="80"
              stroke="#e5e7eb"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="20 15"
            />
            <text
              x="35"
              y="75"
              fontFamily="'Poppins', sans-serif"
              fontSize="48"
              fill="#ffffff"
              fontWeight="700"
              pointerEvents="none"
            >
              ∑
            </text>
            <text
              x="65"
              y="50"
              fontFamily="'Poppins', sans-serif"
              fontSize="38"
              fill="#ffffff"
              fontWeight="700"
              pointerEvents="none"
            >
              √
            </text>
          </svg>
          <span className="text-white font-semibold text-lg select-none">
            MathScanner
          </span>
        </div>
      </header>

      {/* Khu vực chat - chỉ hiển thị khi có messages */}
      {messages.length > 0 && (
        <div className="flex-1 flex justify-center px-4 w-full bg-[#181818]">
          <div
            ref={chatContainer}
            className="w-full max-w-3xl flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-8"
          >
            {messages.map((msg) => (
              <div key={msg.id} className="flex flex-col w-full">
                <div
                  className={`flex ${
                    msg.preview ? "justify-between" : "justify-start"
                  } w-full`}
                >
                  <div className="text-[#e5e7eb] max-w-full break-words">
                    {msg.type === "user" ? null : (
                      <>
                        {msg.latex && (
                          <div className="latex-container">
                            <p className="font-semibold text-base mb-1">
                              Mã LaTeX:
                            </p>
                            <p className="break-words text-[#d4d4d8] text-base mb-1">
                              {msg.latex}
                            </p>
                            <p className="font-semibold text-base mb-1">
                              Công thức:
                            </p>
                            <BlockMath math={msg.latex} />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  {msg.preview && (
                    <div className="ml-4">
                      <img
                        src={msg.preview}
                        alt="Ảnh đã tải lên"
                        className="max-w-full sm:max-w-[250px] rounded"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Container cho MathScanner và thanh upload */}
      <div
        className={`upload-container ${
          messages.length > 0 ? "footer-position" : ""
        }`}
      >
        <div className="upload-block">
          {!hasUploaded && file === null && (
            <div className="text-center py-4">
              <span className="text-white text-3xl font-bold">MathScanner</span>
            </div>
          )}
          <div
            className="flex items-center gap-2 bg-[#242424] rounded-xl p-3 space-x-3 w-full max-w-3xl"
            tabIndex={0}
            onKeyDown={handleKeyDown}
          >
            <label className="flex items-center gap-2 bg-[#3a3a3a] text-[#d4d4d8] px-4 py-2 rounded-full cursor-pointer hover:bg-[#4b4b4b]">
              <i className="fas fa-paperclip"></i>
              <span>Chọn file</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="absolute opacity-0 w-full h-full"
                disabled={isLoading}
              />
            </label>
            <span className="upload-text">
              {file
                ? file.name
                : hasUploaded
                ? "Vui lòng tải lên ảnh chứa công thức toán học."
                : "Xin chào! Vui lòng tải lên ảnh chứa công thức toán học."}
            </span>
            <button
              onClick={handleUpload}
              className="bg-[#3a3a3a] hover:bg-[#4b4b4b] rounded-xl p-2 text-[#d4d4d8]"
              disabled={!file || isLoading}
            >
              <i className="fas fa-arrow-up"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
