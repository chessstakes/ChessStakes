require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const socketIo = require("socket.io");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const stockfish = require("stockfish");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

// Store active chess games
let games = {};

// 🎮 **Multiplayer Chess (Socket.io)**
io.on("connection", (socket) => {
    console.log("Player connected:", socket.id);

    // Player joins a game room
    socket.on("joinGame", (gameId) => {
        socket.join(gameId);
        if (!games[gameId]) {
            games[gameId] = { players: [], moves: [] };
        }
        games[gameId].players.push(socket.id);
        io.to(gameId).emit("gameState", games[gameId]);
    });

    // Handle player moves
    socket.on("move", (data) => {
        games[data.gameId].moves.push(data.move);
        io.to(data.gameId).emit("move", data.move);
    });

    // Handle disconnection
    socket.on("disconnect", () => {
        console.log("Player disconnected");
    });
});

// 🤖 **AI Chess Training (Stockfish)**
app.post("/api/train", (req, res) => {
    const { position } = req.body;
    const engine = stockfish();
    
    engine.onmessage = (message) => {
        if (message.includes("bestmove")) {
            res.json({ suggestion: message });
            engine.terminate();
        }
    };

    engine.postMessage("position fen " + position);
    engine.postMessage("go depth 10");
});

// 💰 **Betting System & Payments (Stripe)**
app.post("/api/bet", async (req, res) => {
    const { amount, playerId } = req.body;

    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount * 100,
            currency: "usd",
            payment_method_types: ["card"],
        });

        res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🚀 **Start the Server**
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
