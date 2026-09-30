// Owner: Sam
// Pieces shared by all models.
import mongoose from "mongoose";

// Location used everywhere: { lat, lng, area }
export const locationSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    area: { type: String, default: "" },
  },
  { _id: false }
);

// JSON sent out uses `id` (string), never `_id` or `__v`.
export const jsonOptions = {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    ret.id = String(ret._id);
    delete ret._id;
    return ret;
  },
};

export const ObjectId = mongoose.Schema.Types.ObjectId;
