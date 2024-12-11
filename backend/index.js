import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import neo4j from "neo4j-driver";
import { Neo4jGraphQL } from "@neo4j/graphql";
import cors from "cors";
import express from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as DiscordStrategy } from "passport-discord";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

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

// Session middleware
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
    })
);

// Passport setup
app.use(passport.initialize());
app.use(passport.session());

// Configure Discord strategy
passport.use(
    new DiscordStrategy(
        {
            clientID: process.env.DISCORD_CLIENT_ID,
            clientSecret: process.env.DISCORD_CLIENT_SECRET,
            callbackURL: process.env.DISCORD_REDIRECT_URI,
            scope: ["identify"],
        },
        (accessToken, refreshToken, profile, done) => {
            // Save user profile or fetch user from DB here
            return done(null, profile);
        }
    )
);

// Serialize and deserialize user
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// OAuth2 routes
app.get(
    "/auth/discord",
    passport.authenticate("discord", { scope: ["identify"] })
);

app.get(
    "/auth/discord/callback",
    passport.authenticate("discord", {
        failureRedirect: "/auth/failure",
        successRedirect: "/auth/success",
    })
);

// Test routes
// app.get("/auth/success", (req, res) => {
//     res.json({ message: "Authentication successful", user: req.user });
// });

app.get("/auth/failure", (req, res) => {
    res.status(401).json({ message: "Authentication failed" });
});

app.get("/logout", (req, res) => {
    req.logout((err) => {
        if (err) return res.status(500).json({ message: "Logout failed" });
        res.redirect("/");
    });
});



// Neo4j configuration
const driver = neo4j.driver(
    "bolt://neo4j:7687",
    neo4j.auth.basic("neo4j", "your_password") // Replace with your Neo4j credentials
);

// GraphQL schema and Apollo Server setup
const typeDefs = `
    type Player {
        id: ID!
        username: String!
        avatar: String!
        globalName: String!
        accessToken: String!
        updatedAt: DateTime! @timestamp
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




const neo4j_session = driver.session();

app.get("/auth/success", async (req, res) => {
    console.log({ message: "Authentication successful", user: req.user });

    // const { code } = req.query;
    const user = req.user;
    console.log(user);

    try {
        // Save user to Neo4j
        await neo4j_session.run(
            `
            MERGE (u:User {id: $id})
            SET u.username = $username,
                u.avatar = $avatar,
                u.globalName = $globalName,
                u.accessToken = $accessToken,
                u.updatedAt = datetime()
            RETURN u
            `,
            {
                id: user.id,
                username: user.username,
                avatar: user.avatar,
                globalName: user.global_name,
                accessToken: user.accessToken,
            }
        );
        // Send response back to frontend
        res.json({ message: "Authentication successful", user });
    } catch (error) {
        console.error("Error during OAuth2 flow:", error.message);
        res.status(500).send("Authentication failed");
    } finally {
        neo4j_session.close();
    }
});

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
const PORT_0 = 3000;
httpServer.listen(PORT_0, () => {
    console.log(`🚀 Socketio Server is running on http://localhost:${PORT_0}`);
});

const startApolloServer = async () => {
    const server = new ApolloServer({
        schema: await neoSchema.getSchema(),
    });

    const { url } = await startStandaloneServer(server, {
        listen: { port: 3002 }, // Apollo
        context: async () => ({ driver }),
    });

    console.log(`🚀 GraphQL server ready at ${url}`);
};

// Start Apollo Server
startApolloServer().catch(console.error);

// Start Express > Passport
const PORT_3 = 3003; // Ensure it's on the new port
app.listen(PORT_3, () => console.log(`🚀 Express Server running on http://localhost:${PORT_3}`));