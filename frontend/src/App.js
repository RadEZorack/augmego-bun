import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:3000"); // Connect to the backend

function App() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");

    useEffect(() => {
        // Listen for messages
        socket.on("message", (data) => {
            setMessages((prev) => [...prev, data]);
        });

        return () => {
            socket.off("message");
        };
    }, []);

    const sendMessage = () => {
        socket.emit("message", input);
        setInput("");
    };

    return (
        <div>
            <h1>Real-Time Chat</h1>
            <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message"
            />
            <button onClick={sendMessage}>Send</button>
            <ul>
                {messages.map((msg, index) => (
                    <li key={index}>{msg}</li>
                ))}
            </ul>
        </div>
    );
}

export default App;
