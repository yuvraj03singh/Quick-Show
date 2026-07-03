import mongoose from "mongoose";
import Show from "./Show.js";

const releaseOccupiedSeats = async (booking) => {
    if (!booking?.show || !Array.isArray(booking.bookedSeats) || booking.bookedSeats.length === 0) {
        return;
    }

    const unsetFields = booking.bookedSeats.reduce((fields, seat) => {
        fields[`occupiedSeats.${seat}`] = "";
        return fields;
    }, {});

    await Show.findByIdAndUpdate(booking.show, {
        $unset: unsetFields,
    });
};

const bookingSchema=new mongoose.Schema(
    {
        user:{type:String ,required:true ,ref:"User" },
        show:{type:String ,required:true ,ref:"Show" },
        amount:{type:Number ,required:true},
        bookedSeats:{type:Array ,required:true},
        isPaid:{type:Boolean ,default:false},
        paymentLink:{type:String},
    },{timestamps:true})

bookingSchema.post("findOneAndDelete", async function (doc) {
    await releaseOccupiedSeats(doc);
});

bookingSchema.post("deleteOne", { document: true, query: false }, async function () {
    await releaseOccupiedSeats(this);
});

bookingSchema.pre("deleteMany", async function () {
    this._bookingsToCleanup = await this.model.find(this.getFilter()).select("show bookedSeats");
});

bookingSchema.post("deleteMany", async function () {
    const bookings = this._bookingsToCleanup || [];

    await Promise.all(bookings.map((booking) => releaseOccupiedSeats(booking)));
});

    const Booking=mongoose.model("Booking",bookingSchema);
    export default Booking;