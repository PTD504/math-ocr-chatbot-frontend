export default function UploadBar({ file, isLoading, hasUploaded, onFileChange, onUpload, onKeyDown }) {
    return (
        <div className="bg-[#181818] border-t border-[#2c2c2c] p-4 flex-shrink-0 w-full">
            <div
                className="flex items-center gap-3 bg-[#242424] rounded-xl p-3 w-full max-w-4xl mx-auto shadow-lg"
                tabIndex={0}
                onKeyDown={onKeyDown}
            >
                <label className="flex items-center gap-2 bg-[#3a3a3a] text-[#d4d4d8] px-4 py-2 rounded-full cursor-pointer hover:bg-[#4b4b4b] relative overflow-hidden">
                    <i className="fas fa-paperclip"></i>
                    <span>Chọn ảnh</span>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={onFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        disabled={isLoading}
                    />
                </label>

                <span className="upload-text flex-1 text-left text-sm text-[#9ca3a1] truncate px-2">
                    {isLoading ? "Đang xử lý..." : file ? file.name : hasUploaded ? "Vui lòng tải ảnh khác." : "Tải ảnh công thức toán học để bắt đầu."}
                </span>

                <button
                    onClick={onUpload}
                    className={`bg-[#3a3a3a] rounded-xl p-2 text-[#d4d4d8] w-10 h-10 flex items-center justify-center transition-colors duration-200
                        ${!file || isLoading ? "opacity-50 cursor-not-allowed" : "hover:bg-[#4b4b4b]"}`}
                    disabled={!file || isLoading}
                >
                    {isLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-arrow-up"></i>}
                </button>
            </div>
        </div>
    );
}