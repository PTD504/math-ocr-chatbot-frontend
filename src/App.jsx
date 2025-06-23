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
  const [hasUploaded, setHasUploaded] = useState(false); // Theo dõi đã upload lần nào chưa
  const chatContainer = useRef(null);
  const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

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
    setHasUploaded(true);

    const userMessage = { type: "user", preview: previewUrl, id: `user-${Date.now()}` };
    setMessages((prevMessages) => [...prevMessages, userMessage]);

    try {
      let botResponseData;

      if (API_BASE_URL) {
        console.log("Calling real API at:", API_BASE_URL);
        const formData = new FormData();
        formData.append("file", file);

        const response = await axios.post(
          `${API_BASE_URL}/predict`,
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );
        botResponseData = {
          formula: response.data.formula || "\\text{Không có công thức}",
        };
      } else {
        console.warn("VITE_BACKEND_URL is not set. Using mock API.");
        await new Promise((resolve) => setTimeout(resolve, 1500));

        const mockFormula = `\\text{Mock formula for file: ${file.name}}.`;
        botResponseData = { formula: mockFormula };
      }

      setMessages((prevMessages) => [
        ...prevMessages, 
        {
          type: "bot",
          latex: botResponseData.formula,
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
      } else {
        errorMessage = `\\text{Lỗi kết nối API: ${error.message}. Vui lòng thử lại sau.}`;
      }
      setMessages((prevMessages) => [
        ...prevMessages, 
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
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && file && !isLoading) {
      handleUpload();
    }
  };

  // Scroll to bottom on new message
  useEffect(() => {
    if (chatContainer.current) {
      chatContainer.current.scrollTop = chatContainer.current.scrollHeight;
    }
  }, [messages]);

  // Clean up preview URL
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#181818] text-[#e5e7eb] overflow-x-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-[#2c2c2c] w-full z-10">
        <div className="flex items-center space-x-3"> {/* Tăng space-x một chút */}
          <svg
            viewBox="0 0 120 120"
            className="w-8 h-8" // Tăng kích thước icon
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
          <span className="text-white font-extrabold text-xl select-none"> {/* Bold hơn, lớn hơn */}
            MathScanner
          </span>
        </div>
      </header>

      {/* Main chat area */}
      {messages.length === 0 && !hasUploaded ? (
        // Trang chào mừng khi chưa có tin nhắn
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
          <svg
            viewBox="0 0 120 120"
            className="w-24 h-24 mb-4"
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
          <h2 className="text-3xl font-bold mb-2">Chào mừng đến với MathScanner!</h2>
          <p className="text-lg text-[#a0a0a0] max-w-md">
            Hãy tải lên một ảnh chứa công thức toán học để tôi có thể giúp bạn giải mã chúng thành dạng LaTeX.
          </p>
        </div>
      ) : (
        // Khu vực chat - hiển thị khi có messages
        <div className="flex-1 flex justify-center px-4 w-full bg-[#181818] overflow-hidden">
          <div
            ref={chatContainer}
            className="w-full max-w-3xl flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-thin scrollbar-thumb-[#4b4b4b] scrollbar-track-[#2c2c2c]"
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.type === "user" ? "justify-end" : "justify-start"
                } w-full`}
              >
                <div
                  className={`message-bubble ${
                    msg.type === "user"
                      ? "bg-[#3a3a3a] text-[#e5e7eb] rounded-br-none"
                      : "bg-[#2c2c2c] text-[#e5e7eb] rounded-bl-none"
                  } p-4 rounded-xl max-w-[80%] md:max-w-[70%] break-words`}
                >
                  {msg.type === "user" && msg.preview && (
                    <img
                      src={msg.preview}
                      alt="Ảnh đã tải lên"
                      className="max-w-full rounded mb-2"
                      style={{ maxWidth: '250px' }} // Đảm bảo ảnh không quá lớn
                    />
                  )}
                  {msg.type === "bot" && msg.latex && (
                    <div className="latex-result">
                      <p className="font-semibold text-sm text-[#d4d4d8] mb-1">Mã LaTeX:</p>
                      <p className="break-words text-base mb-2 select-all p-2 bg-[#1e1e1e] rounded border border-[#3a3a3a] overflow-x-auto">
                        {msg.latex}
                      </p>
                      <p className="font-semibold text-sm text-[#d4d4d8] mb-1">Công thức:</p>
                      <div className="latex-display-container p-2 bg-[#1e1e1e] rounded border border-[#3a3a3a] overflow-x-auto">
                        <BlockMath math={msg.latex} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start w-full">
                <div className="message-bubble bg-[#2c2c2c] text-[#e5e7eb] rounded-xl rounded-bl-none p-4 max-w-[80%] md:max-w-[70%]">
                  <div className="loading-dots">
                    <div></div>
                    <div></div>
                    <div></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Input / Upload area */}
      <div className="upload-container bg-[#181818] border-t border-[#2c2c2c] p-4 flex justify-center z-10">
        <div
          className="flex items-center gap-3 bg-[#242424] rounded-xl p-3 w-full max-w-3xl shadow-lg"
          tabIndex={0}
          onKeyDown={handleKeyDown}
        >
          <label className="flex items-center gap-2 bg-[#3a3a3a] text-[#d4d4d8] px-4 py-2 rounded-full cursor-pointer hover:bg-[#4b4b4b] transition-colors duration-200 relative overflow-hidden">
            <i className="fas fa-paperclip"></i>
            <span className="whitespace-nowrap">Chọn ảnh</span> {/* Rút gọn text */}
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
              disabled={isLoading}
            />
          </label>
          <span className="upload-text flex-1 text-left text-sm text-[#9ca3a1] truncate px-2"> {/* Truncate dài hơn */}
            {isLoading ? (
              "Đang xử lý..."
            ) : file ? (
              file.name
            ) : hasUploaded ? (
              "Vui lòng tải lên ảnh chứa công thức toán học."
            ) : (
              "Tải lên ảnh chứa công thức toán học để bắt đầu."
            )}
          </span>
          <button
            onClick={handleUpload}
            className={`bg-[#3a3a3a] rounded-xl p-2 text-[#d4d4d8] flex items-center justify-center w-10 h-10 transition-colors duration-200
              ${!file || isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#4b4b4b]'}
            `}
            disabled={!file || isLoading}
          >
            {isLoading ? (
              <i className="fas fa-spinner fa-spin"></i> // Loading spinner
            ) : (
              <i className="fas fa-arrow-up"></i>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;