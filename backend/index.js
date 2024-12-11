import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import neo4j from "neo4j-driver";
import { Neo4jGraphQL } from "@neo4j/graphql";
import cors from "cors";
import express from "express";

const app = express();
const httpServer = createServer(app);

// Configure CORS for both Apollo and Socket.io
const corsOptions = {
    origin: "http://localhost:3001", // React frontend
    methods: ["GET", "POST"],
    credentials: true,
};

// Apply CORS middleware to the Express app
app.use(cors(corsOptions));

// Neo4j configuration
const driver = neo4j.driver(
    "bolt://localhost:7687",
    neo4j.auth.basic("neo4j", "password") // Replace with your Neo4j credentials
);

// GraphQL schema and Apollo Server setup
const typeDefs = `
    type Player {
        id: ID!
        name: String!
        createdAt: DateTime! @timestamp
        owns: [Object!]! @relationship(type: "OWNS", direction: OUT)
    }

    type Object {
        id: ID!
        name: String!
        owner: Player @relationship(type: "OWNS", direction: IN)
    }
`;

const neoSchema = new Neo4jGraphQL({ typeDefs, driver });

const startApolloServer = async () => {
    const server = new ApolloServer({
        schema: await neoSchema.getSchema(),
    });

    const { url } = await startStandaloneServer(server, {
        listen: { port: 3002 },
        context: async () => ({ driver }),
    });

    console.log(`🚀 GraphQL server ready at ${url}`);
};



// Start Apollo Server
startApolloServer().catch(console.error);

// Socket.io setup
const io = new SocketIOServer(httpServer, {
    cors: {
        origin: "http://localhost:3001", // React frontend
        methods: ["GET", "POST"],
    },
});

io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Example message handler
    socket.on("message", (data) => {
        console.log("Received message:", data);
        io.emit("message", data); // Broadcast to all clients
    });

    socket.on("disconnect", () => {
        console.log(`Socket disconnected: ${socket.id}`);
    });
});

// Start the HTTP server
const PORT = 3000;
httpServer.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
