import axios from "axios";
import https from "https";
import Movie from "../model/Movie.js";
import Show from "../model/Show.js";

// Force IPv4 (fixes ECONNRESET in many Windows cases)
const agent = new https.Agent({
  family: 4,
  keepAlive: false,
});

// Retry function
const fetchWithRetry = async (url, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.get(url, {
        httpsAgent: agent,
        headers: {
          Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
        },
        timeout: 10000,
      });

      return response;
    } catch (error) {
      console.log(`Retry ${i + 1} failed:`, error.message);

      if (i === retries - 1) {
        throw error;
      }
    }
  }
};

// API call to fetch now playing movies
export const getNowPlayingMovies = async (req, res) => {
  try {
    const { data } = await fetchWithRetry(
      "https://api.themoviedb.org/3/movie/now_playing"
    );

    res.json({
      success: true,
      movies: data.results,
    });
  } catch (error) {
    console.error("Now Playing Error:", error.message);

    res.json({
      success: false,
      message: error.message,
    });
  }
};

// API to add a new show
export const addShow = async (req, res) => {
  try {
    const { movieId, showInput, showPrice } = req.body;

    let movie = await Movie.findById(movieId);

    // If movie not in DB, fetch from TMDB
    if (!movie) {
      console.log("Fetching movie details...");

      const movieDetailsResponse = await fetchWithRetry(
        `https://api.themoviedb.org/3/movie/${movieId}`
      );

      console.log("Movie details fetched");

      const movieCreditsResponse = await fetchWithRetry(
        `https://api.themoviedb.org/3/movie/${movieId}/credits`
      );

      console.log("Movie credits fetched");

      const movieApiData = movieDetailsResponse.data;
      const movieCreditsData = movieCreditsResponse.data;

      const movieDetails = {
        _id: movieId,
        title: movieApiData.title,
        overview: movieApiData.overview,
        poster_path: movieApiData.poster_path,
        backdrop_path: movieApiData.backdrop_path,
        release_date: movieApiData.release_date,
        original_language: movieApiData.original_language,
        tagline: movieApiData.tagline,
        genres: movieApiData.genres,
        casts: movieCreditsData.cast.slice(0, 10), // limit cast
        vote_average: movieApiData.vote_average,
        runtime: movieApiData.runtime,
      };

      movie = await Movie.create(movieDetails);
      console.log("Movie saved to DB");
    }

    // Create shows
    const showToCreate = [];

    showInput.forEach((show) => {
  const showDate = show.date;

  const times = show.times || show.time || [];

  times.forEach((time) => {
    const dateTimeString = `${showDate}T${time}:00`;

    showToCreate.push({
      movie: movieId,
      showDateTime: new Date(dateTimeString),
      showPrice,
      occupiedSeats: {},
    });
  });
});

    if (showToCreate.length > 0) {
      await Show.insertMany(showToCreate);

      res.json({
        success: true,
        message: "Show added successfully",
      });
    } else {
      res.json({
        success: false,
        message: "No shows to add",
      });
    }
  } catch (error) {
    console.error("Add Show Error:", error.message);

    res.json({
      success: false,
      message: error.message,
    });
  }
};


//api to get all shows
export const getShows = async (req, res) => {
  try {
    const shows = await Show.find({showDateTime: { $gte: new Date() } }).populate("movie").sort({ showDateTime: 1 });
    const uniqueShows = new Set(shows.map(show=>show.movie))

    res.json({
      success: true,
      shows: Array.from(uniqueShows),
    });
  }
catch (error) {

    console.error("Get Shows Error:", error.message);

    res.json({
      success: false,
      message: error.message,
    });

  }
}