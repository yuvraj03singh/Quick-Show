import Show from "../model/Show.js";
import Movie from "../model/Movie.js";
import https from "https";
import axios from "axios";

const agent = new https.Agent({
  family: 4,
  keepAlive: false,
});

// Retry helper
const fetchWithRetry = async (url, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.get(url, {
        httpsAgent: agent,
        headers: {
          Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
        },
        timeout: 30000,
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

// Get now playing movies
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

// Add show
export const addShow = async (req, res) => {
  try {
    const { movieId, showsInput, showPrice } = req.body;

    let movie = await Movie.findById(movieId);

    // If movie not in DB, fetch from TMDB
    if (!movie) {
      const movieDetailsResponse = await fetchWithRetry(
        `https://api.themoviedb.org/3/movie/${movieId}`
      );

      const movieCreditsResponse = await fetchWithRetry(
        `https://api.themoviedb.org/3/movie/${movieId}/credits`
      );

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
        casts: movieCreditsData.cast.slice(0, 10),
        vote_average: movieApiData.vote_average,
        runtime: movieApiData.runtime,
      };

      movie = await Movie.create(movieDetails);
    }

    const showToCreate = [];

    showsInput.forEach((show) => {
      const dateTimeString = `${show.date}T${show.time}:00`;

      showToCreate.push({
        movie: movieId,
        showDateTime: new Date(dateTimeString),
        showPrice,
        occupiedSeats: {},
      });
    });

    await Show.insertMany(showToCreate);

    res.json({
      success: true,
      message: "Show added successfully",
    });
  } catch (error) {
    console.error("Add Show Error:", error.message);

    res.json({
      success: false,
      message: error.message,
    });
  }
};

// Get all unique shows
export const getShows = async (req, res) => {
  try {
    const shows = await Show.find({})
      .populate("movie")
      .sort({ createdAt: -1 });

    // remove null movie refs
    const validShows = shows.filter((show) => show.movie);

    const uniqueShows = [
      ...new Map(
        validShows.map((show) => [
          show.movie._id.toString(),
          show.movie,
        ])
      ).values(),
    ];

    res.json({
      success: true,
      shows: uniqueShows,
    });
  } catch (error) {
    console.error("Get Shows Error:", error.message);

    res.json({
      success: false,
      message: error.message,
    });
  }
};

// Get single movie show details
export const getShow = async (req, res) => {
  try {
    const { movieId } = req.params;

    const shows = await Show.find({ movie: movieId }).sort({
      showDateTime: 1,
    });

    const movie = await Movie.findById(movieId);

    if (!movie) {
      return res.json({
        success: false,
        message: "Movie not found",
      });
    }

    const dateTime = {};

    shows.forEach((show) => {
      const date = new Date(show.showDateTime)
        .toISOString()
        .split("T")[0];

      const time = new Date(show.showDateTime).toLocaleTimeString(
        "en-US",
        {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }
      );

      if (!dateTime[date]) {
        dateTime[date] = [];
      }

      dateTime[date].push({
        time,
        showId: show._id,
      });
    });

    res.json({
      success: true,
      movie,
      dateTime,
    });
  } catch (error) {
    console.error("Get Show Error:", error.message);

    res.json({
      success: false,
      message: error.message,
    });
  }
};