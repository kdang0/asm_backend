import express from "express";
import morgan from "morgan";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import userRouter from "./routes/User.js";
import assignmentRouter from "./routes/Assignment.js";
import classRouter from "./routes/Class.js";
import submissionRouter from "./routes/Submission.js";
import session from "express-session";
import passport from "passport";
import initializePassport from "./passport-config.js";
import User from "./models/User.js";
import MongoStore from "connect-mongo";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 4000;

initializePassport(
  passport,
  async (username) => await User.findOne({ userName: username }),
  async (id) => await User.findById(id)
);

// Connect to DB
const db = mongoose.connection;

try {
  await mongoose.connect(process.env.MONGO_URI);
} catch (error) {
  console.error(error);
}

// ===== Middlewares ===== //
app.use(morgan("dev")); // logger
app.use(express.json()); // parse data to the body
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: process.env.ORIGIN_URL,
    credentials: true,
  })
); // allows backend to talk to frontend in the same machine
app.use(
  session({
    secret: "secret",
    resave: false,
    saveUninitialized: false,
    store: new MongoStore({ mongoUrl: db.client.s.url }),
    cookie: {
      secure: true,
      sameSite: "None"
    }
  })
);

app.use(passport.initialize());
app.use(passport.session());

//===== Routes =====

//authenticates user using passport middleware
// app.post(
//   "/login",
//   passport.authenticate("local", {
//     successRedirect: "/login-success",
//     failureRedirect: "/login-failure",
//   })
// );

app.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ message: "Invalid username or password" });
    
    // Explicitly call req.login
    req.logIn(user, (err) => {
      if (err) return next(err);
      res.status(200).json({ message: "Login successful", user });
    });
  })(req, res, next);
});

//destroys session store
app.delete("/logout", (req, res, next) => {
  req.session.destroy();
  res.json("Success");
});

//sends user information on successful authentication
app.get("/login-success", (req, res, next) => {
  console.log("USER: ", req.user);
  res.json({ user: req.user });
});

//sends invalid username/password message to frontend on unsuccessful authentication
app.get("/login-failure", (req, res, next) => {
  res.json("Invalid username or password");
});

/**
 * Checks if user is currently authenticated
 * If yes then give authenticated user information to front end
 */
app.get("/profile", (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.json({ message: "You are not authenticated" });
  }
});

//Retrieving quote from 3rd part API (zenquotes API)
app.get("/quote", async (req, res) => {
  const result = await fetch("https://zenquotes.io/api/random");
  const data = await result.json();
  const quote = data[0];
  res.json(quote);
});

app.use("/user", userRouter);
app.use("/assignment", assignmentRouter);
app.use("/class", classRouter);
app.use("/submission", submissionRouter);

// ===== Error Middlewares ===== //
app.use((e, req, res, next) => {
  console.error(e);
  res.status(500).json({ message: e.message, error: e });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
