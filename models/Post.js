const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create Schema
const PostSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "users",
  },
  userName: {
    type: String,
    ref: "users",
  },
  title: {
    type: String,
    required: true,
  },

  description: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  categoryName: {
    type: String,
    required: true,
  },
  subCategory: {
    type: String,
    required: true,
  },
  numViews: {
    type: Number,
    default: 0,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  status: {
    // posts have 4 status -> "active": new post & "gothelp": someone helped post owner
    //"ended": duedate came without help & "deleted": post owner deleted it
    type: String,
    default: "active",
  },
  tags: {
    type: String,
  },
  created: { type: Date, expires: 0 },
});

module.exports = Post = mongoose.model("posts", PostSchema);
