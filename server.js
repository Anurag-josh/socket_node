const express = require('express');
const http = require('http');
const https = require('https');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*", // allow all origins
        methods: ["GET", "POST"]
    }
});

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// MongoDB Schemas and Models
const commentSchema = new mongoose.Schema({
    id: String,
    sender: String,
    text: String,
    timestamp: String,
});

const postSchema = new mongoose.Schema({
    id: String,
    sender: String,
    text: String,
    imageUrl: String,
    timestamp: String,
    comments: [commentSchema]
});

const Post = mongoose.model('Post', postSchema);

io.on('connection', async (socket) => {
    console.log('User connected:', socket.id);

    // Fetch existing posts and send to the connected user
    try {
        const posts = await Post.find().sort({ _id: -1 }).limit(100);
        socket.emit('initial_posts', posts);
    } catch (err) {
        console.error('Error fetching posts:', err);
    }

    // Listen for incoming posts
    socket.on('send_post', async (postData) => {
        console.log('New post received:', postData);
        try {
            const newPost = new Post(postData);
            await newPost.save();
            // Broadcast the post to everyone EXCEPT the sender
            socket.broadcast.emit('receive_post', postData);
        } catch (err) {
            console.error('Error saving post:', err);
        }
    });

    // Listen for comments
    socket.on('add_comment', async (data) => {
        console.log('New comment received:', data);
        try {
            await Post.findOneAndUpdate(
                { id: data.postId },
                { $push: { comments: data.comment } }
            );
            socket.broadcast.emit('receive_comment', data);
        } catch (err) {
            console.error('Error adding comment:', err);
        }
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
