const express = require('express');
const http = require('http');
const https = require('https');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*", // allow all origins
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Listen for incoming posts
    socket.on('send_post', (postData) => {
        console.log('New post received:', postData);
        // Broadcast the post to everyone EXCEPT the sender
        socket.broadcast.emit('receive_post', postData);
    });

    // Listen for comments
    socket.on('add_comment', (data) => {
        console.log('New comment received:', data);
        socket.broadcast.emit('receive_comment', data);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Use 0.0.0.0 to accept connections from other devices on the same network
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Socket.IO Server is running on port ${PORT}`);
    console.log(`Ensure your devices connect to http://<YOUR_LOCAL_IP>:${PORT}`);
});

// Function to ping the deployed server every 10 minutes
setInterval(() => {
    https.get('https://socket-node-6fls.onrender.com', (res) => {
        console.log('Ping sent to keep server alive');
    }).on('error', (err) => {
        console.log('Ping error:', err.message);
    });
}, 10 * 60 * 1000); // 10 minutes in milliseconds
