import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { useAuth, useUser } from "@clerk/react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";

axios.defaults.baseURL =
  import.meta.env.VITE_BASE_URL || "http://localhost:3000";

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(null);
  const [shows, setShows] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const image_base_url=import.meta.env.VITE_TMDB_IMAGE_BASE_URL || "https://image.tmdb.org/t/p/original";

  const { user } = useUser();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const fetchIsAdmin = async () => {
    try {
      const token = await getToken();

      if (!token){
        setIsAdmin(false);
        return;
      };

      const { data } = await axios.get("/api/admin/is-admin", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setIsAdmin(data.isAdmin);
    }catch (error) {
      setIsAdmin(false);
      console.error("Error fetching admin status:", error);
    }
  };

  const fetchShows = async () => {
    try {
      const { data } = await axios.get("/api/show/all");

      if (data.success) {
        setShows(data.shows);
      } else {
        toast.error(data.message || "Failed to fetch shows");
      }
    } catch (error) {
      console.error("Error fetching shows:", error);
    }
  };

 const fetchFavoritesMovies = async () => {
  try {
    const token = await getToken();
    // console.log("FRONTEND TOKEN:", token);

    if (!token){
      setFavorites([]);
      return;
    } 
      

    const { data } = await axios.get("/api/user/favorites", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log(data);
  } catch (error) {
    console.error(error);
  }
};
  useEffect(() => {
    fetchShows();
  }, []);

  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      fetchIsAdmin();
      fetchFavoritesMovies();
    }
  }, [isLoaded, isSignedIn, user]);

  const value = {
    axios,
    fetchIsAdmin,
    user,
    getToken,
    navigate,
    isAdmin,
    shows,
    favorites,
    fetchFavoritesMovies,
    fetchShows,
    image_base_url
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => useContext(AppContext);
