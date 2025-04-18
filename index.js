const express = require("express");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const mongoose = require("mongoose");

const { Movie, User } = require("./models");

const mongoURI = "mongodb://127.0.0.1:27017/movieDB";
mongoose
  .connect(mongoURI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

const app = express();
const port = 8080; // Change if needed

app.use(bodyParser.json());
app.use(express.static("public")); // Serve static files /documentation will work automatically
app.use(morgan("common")); // "common" muestra logs básicos

// Homepage
app.get("/", (req, res) => {
  res.send("Welcome to the Movie API!");
});

// GET All Movies (from MongoDB)
app.get("/movies", async (req, res) => {
  try {
    const movies = await Movie.find(); // Fetch all movies
    res.json(movies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET a single movie by title
app.get("/movies/:title", async (req, res) => {
  try {
    const movie = await Movie.findOne({ title: req.params.title }); // Find movie by title
    if (!movie) return res.status(404).json({ message: "Movie not found" });
    res.json(movie);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//  Get genre details by name
app.get("/genres/:name", async (req, res) => {
  try {
    console.log(`Looking for genre: ${req.params.name}`);
    const movie = await Movie.findOne({ "genre.name": req.params.name });
    console.log(`Found movie:`, movie);

    if (!movie) return res.status(404).json({ message: "Genre not found" });

    res.json(movie.genre);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/directors/:name", async (req, res) => {
  try {
    console.log(`Received request for director: ${req.params.name}`); // Debugging log
    const movies = await Movie.find({ "director.name": req.params.name });

    console.log(`MongoDB query result:`, movies); // Log what MongoDB returns

    if (!movies || movies.length === 0) {
      console.log(`Director ${req.params.name} not found in database.`);
      return res.status(404).json({ message: "Director not found" });
    }

    res.json(movies);
  } catch (err) {
    console.error(`Error fetching director: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// Register a new user
app.post("/users", async (req, res) => {
  try {
    const existingUser = await User.findOne({ username: req.body.username });
    if (existingUser)
      return res.status(400).json({ message: "Username already exists" });

    const newUser = new User(req.body);
    await newUser.save();
    res.status(201).json(newUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user info
app.put("/users/:username", async (req, res) => {
  try {
    const updatedUser = await User.findOneAndUpdate(
      { username: req.params.username },
      { $set: req.body },
      { new: true }
    );
    if (!updatedUser)
      return res.status(404).json({ message: "User not found" });
    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a movie to user's favorite list
app.post('/users/:username/movies/:movieId', async (req, res) => {
  try {
      console.log('Received request to add movie to favorites');
      console.log('Username:', req.params.username);
      console.log('Movie ID:', req.params.movieId);

      const updatedUser = await User.findOneAndUpdate(
          { username: req.params.username },
          { $addToSet: { favoriteMovies: req.params.movieId } }, // Prevent duplicates
          { new: true }
      );

      if (!updatedUser) {
          console.log('User not found');
          return res.status(404).json({ message: 'User not found' });
      }

      console.log('Updated user:', updatedUser);
      res.json(updatedUser);
  } catch (err) {
      console.error('Error updating user:', err);
      res.status(500).json({ error: err.message });
  }
});


// Remove a movie from user’s favorite list
app.delete("/users/:username/movies/:movieId", async (req, res) => {
  try {
    console.log("Deleting movie from favorites...");
    console.log("Username:", req.params.username);
    console.log("Movie ID:", req.params.movieId);

    const movieId = new mongoose.Types.ObjectId(req.params.movieId); // Convert to ObjectId

    const updatedUser = await User.findOneAndUpdate(
      { username: req.params.username },
      { $pull: { favoriteMovies: movieId } }, // Pull using ObjectId
      { new: true }
    );

    if (!updatedUser) {
      console.log("User not found");
      return res.status(404).json({ message: "User not found" });
    }

    console.log("Updated user:", updatedUser);
    res.json(updatedUser);
  } catch (err) {
    console.error("Error deleting movie from favorites:", err);
    res.status(500).json({ error: err.message });
  }
});

// Deregister a user
app.delete("/users/:username", async (req, res) => {
  try {
    const deletedUser = await User.findOneAndDelete({
      username: req.params.username,
    });
    if (!deletedUser)
      return res.status(404).json({ message: "User not found" });
    res.json({ message: `User ${req.params.username} deleted` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/documentation", (req, res) => {
  res.sendFile(__dirname + "/public/documentation.html");
});

// Middleware de manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something went wrong! Please try again later.");
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`App is running on http://localhost:${port}`);
});
