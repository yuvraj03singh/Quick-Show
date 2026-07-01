import Show from "../model/Show.js";
import Booking from "../model/Booking.js";

//Function to check availability of seats for a specific show

const checkSeatAvailability = async (showId, selectedSeats) => {
    try {
        const showData = await Show.findById(showId);
        if (!showData) return false;

            const occupiedSeats = showData.occupiedSeats || {};
            
            const isAnySeatTaken = selectedSeats.some(seat => occupiedSeats[seat]);
            return !isAnySeatTaken;


        } catch (error) {

            console.error("Error checking seat availability:", error);
            return false;


        }
    }
    

    export const createBooking = async (req, res) => {
        try {
                const {userId}=req.auth;
            const {showId,selectedSeats}=req.body;
            const {origin}=req.headers;

            //check if the selected seats are available for the show

            const isAvailable = await checkSeatAvailability(showId, selectedSeats);

            if (!isAvailable) {
                return res.status(400).json({ success: false, message: "Selected seats are already booked." });
            }

            //get the show details
            const showData=await Show.findById(showId).populate("movie");

            //create new booking
            const booking=await  Booking.create({
                user:userId,
                show:showId,
                amount:showData.showPrice*selectedSeats.length,
                bookedSeats:selectedSeats,
            })
            selectedSeats.map((seat)=>{
                showData.occupiedSeats[seat]=userId;
            })

            showData.markModified("occupiedSeats");
            await showData.save();
             

        // stripe gateway integration

        res.json({
            success:true,
            message:"Booking created successfully",
        })


        }catch(error){
          console.log("Create Booking Error:", error.message);
          res.json({
          success: false,
          message: error.message,
         });
            }
        }


        export const getOccupiedSeats = async (req, res) => {
try{

    const {showId}=req.params;
    const showData=await Show.findById(showId);

    const occupiedSeats=Object.keys(showData.occupiedSeats || {});

    res.json({
        success:true,
        occupiedSeats:occupiedSeats,
    })
    
}catch(error){
    console.log(error.message);
    res.json({
        success:false,
        message:error.message,
    })

    }

  } 