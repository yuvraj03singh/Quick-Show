import React, { memo } from "react";
import MovieCard from "../components/MovieCard";
import BlurCircle from "../components/BlurCircle";
import { useAppContext } from "../context/AppContext";

const Movies = () => {
  const { shows = [] } = useAppContext();

  if (!shows.length) {
    return (
      <div className="flex items-center justify-center h-screen">
        <h1 className="text-3xl font-bold text-center">
          No Movies Available
        </h1>
      </div>
    );
  }

  return (
    <section
      className="relative my-40 mb-60 px-6 md:px-16 lg:px-40 xl:px-44 overflow-hidden min-h-[80vh]"
    >
      <BlurCircle top="150px" left="0" />
      <BlurCircle bottom="50px" right="50px" />

      <h1 className="text-lg font-medium my-4">Now Showing</h1>

      <div className="flex flex-wrap gap-8 max-sm:justify-center">
        {shows.map((movie) => (
          <MovieCard key={movie._id} movie={movie} />
        ))}
      </div>
    </section>
  );
};

export default memo(Movies);