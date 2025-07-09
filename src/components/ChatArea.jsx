import { BlockMath } from "react-katex";

export default function ChatArea({ messages, isLoading, userProfile, chatContainerRef }) {
    return (
        <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-[#4b4b4b] scrollbar-track-[#2c2c2c]"
        >
            {messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4 h-full">
                    <p className="text-xl font-bold text-[#e5e7eb] mb-2">
                        Xin chào {userProfile.name}!
                    </p>
                    {userProfile.isAnonymous && (
                        <p className="text-sm text-yellow-400 mb-2">
                            Bạn đang sử dụng tài khoản khách - phiên làm việc có thời hạn 15 phút
                        </p>
                    )}
                    <p className="text-lg text-[#a0a0a0] max-w-md">
                        Hãy tải lên một ảnh chứa công thức toán học để tôi giúp bạn chuyển đổi sang LaTeX.
                    </p>
                </div>
            ) : (
                messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"} w-full`}
                    >
                        <div
                            className={`message-bubble ${
                                msg.type === "user"
                                    ? "bg-[#3a3a3a] text-[#e5e7eb] rounded-br-none"
                                    : "bg-[#2c2c2c] text-[#e5e7eb] rounded-bl-none"
                            } p-4 rounded-xl max-w-[80%] md:max-w-[70%] break-words`}
                        >
                            {msg.type === "user" && (msg.preview || msg.imageData) && (
                                <img
                                    src={msg.imageData || msg.preview}
                                    alt={msg.fileName || "Uploaded image"}
                                    className="max-w-full rounded mb-2"
                                    style={{ maxWidth: "250px" }}
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'block';
                                    }}
                                />
                            )}
                            {msg.type === "user" && msg.fileName && (
                                <div
                                    className="text-gray-400 text-sm italic mb-2"
                                    style={{ display: 'none' }}
                                >
                                    📷 {msg.fileName}
                                </div>
                            )}
                            {msg.type === "bot" && msg.latex && (
                                <div className="latex-result">
                                    <p className="font-semibold text-sm text-[#d4d4d8] mb-1">Mã LaTeX:</p>
                                    <p className="break-words text-base mb-2 select-all p-2 bg-[#1e1e1e] rounded border border-[#3a3a3a] overflow-x-auto whitespace-pre-wrap">
                                        {msg.latex}
                                    </p>
                                    <p className="font-semibold text-sm text-[#d4d4d8] mb-1">Công thức:</p>
                                    <div className="p-2 bg-[#1e1e1e] rounded border border-[#3a3a3a] overflow-x-auto">
                                        <BlockMath math={msg.latex} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))
            )}
            {isLoading && (
                <div className="flex justify-start w-full">
                    <div className="message-bubble bg-[#2c2c2c] text-[#e5e7eb] rounded-xl rounded-bl-none p-4 max-w-[80%] md:max-w-[70%]">
                        <div className="loading-dots">
                            <div></div><div></div><div></div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
