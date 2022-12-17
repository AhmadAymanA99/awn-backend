const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const passport = require("passport");

// Post model
const Post = require("../../models/Post");
// RegisteredUser model
const RegisteredUse = require("../../models/User.js").RegisteredUser;

// Validation
const validatePostInput = require("../../validation/post");

// @route   GET api/posts/test
// @desc    Tests post route
// @access  Public
router.get("/test", (req, res) => res.json({ msg: "Posts Works" }));
// @route   GET api/posts/allposts
// @desc    Get all posts
// @access  Public
router.get("/allposts", (req, res) => {
  Post.find()
    .sort({ date: -1 })
    .limit() // no limit for now, show all
    .then((posts) => res.json(posts))
    .catch((err) => res.status(404).json({ nopostsfound: "No posts found" }));
});
// ******************************** Pagination *************************
// @route   GET api/posts            ||  GET api/posts?page=..
// @desc    Get all posts if page=0  ||  paginate posts if page>=1
// @access  Public
router.get("/", (req, res) => {
  const page = parseInt(req.query.page);
  var limit, PostSkiped;
  // to return all posts set page=0
  if (page == 0) {
    limit = 0;
    PostSkiped = 0;
  } else {
    limit = 30; // posts per page = 30
    PostSkiped = (page - 1) * limit;
  }
  Post.find({ status: "active" })
    .sort({ date: -1 })
    .skip(PostSkiped)
    .limit(limit)
    .then((posts) => res.json(posts))
    .catch((err) => res.status(404).json({ nopostsfound: "No posts found" }));
});
// ******************************************************************************

// @route   GET api/posts/donation
// @desc    Get all posts in donation category
// @access  Public
router.get("/donation", (req, res) => {
  Post.find({ categoryName: "Donation", status: "active" })
    .sort({ date: -1 })
    .limit() // no limit for now, show all
    .then((posts) => res.json(posts))
    .catch((err) => res.status(404).json({ nopostsfound: "No posts found" }));
});

// @route   GET api/posts/volunteering
// @desc    Get all posts in volunteering category
// @access  Public
router.get("/volunteering", (req, res) => {
  Post.find({ categoryName: "Volunteering", status: "active" })
    .sort({ date: -1 })
    .limit() // no limit for now, show all
    .then((posts) => res.json(posts))
    .catch((err) => res.status(404).json({ nopostsfound: "No posts found" }));
});

// @route   GET api/posts/recycling
// @desc    Get all posts in recycling category
// @access  Public
router.get("/recycling", (req, res) => {
  Post.find({ categoryName: "Recycling", status: "active" })
    .sort({ date: -1 })
    .limit() // no limit for now, show all
    .then((posts) => res.json(posts))
    .catch((err) => res.status(404).json({ nopostsfound: "No posts found" }));
});

// ----------------------------------------------------------------------------

// @route   GET api/posts/postNums
// @desc    Get total number of posts
// @access  Public
router.get("/postNums", (req, res) => {
  Post.find()
    .then((posts) => res.json(posts.length))
    .catch((err) => res.status(404).json({ nopostsfound: "No posts found" }));
});

// @route   GET api/posts/postid/:id
// @desc    Get post by its id
// @access  Public
router.get("/postid/:id", (req, res) => {
  Post.findById(req.params.id)
    .then((post) => res.json(post))
    .catch((err) => res.status(404).json({ nopostfound: "No post found with that ID" }));
});

// @route   POST api/posts
// @desc    Create post
// @access  Private
router.post("/", passport.authenticate("jwt", { session: false }), (req, res) => {
  RegisteredUse.findById(req.user.id).then((user) => {
    if (user.postLimit < 5) {
      //set max posts per month to be 5
      const { errors, isValid } = validatePostInput(req.body);
      // Check Validation
      if (!isValid) {
        // If any errors, send 400 with errors object
        return res.status(400).json(errors);
      }

      const newPost = new Post({
        user: req.user.id,
        userName: req.user.userName,
        title: req.body.title,
        description: req.body.description,
        tags: req.body.tags,
        location: req.body.location,
        categoryName: req.body.categoryName,
        subCategory: req.body.subCategory,
        status: req.body.status,
        dueDate: req.body.dueDate,
      });

      RegisteredUse.findByIdAndUpdate({ _id: req.user.id }, { $inc: { postLimit: 1 } }).then(newPost.save().then((post) => res.json(post)));
    } else {
      return res.status(400).json({
        excededMaxNumPosts: "You exceeded the maximum number of posts for this month.",
      });
    }
  });
});

// @route   DELETE api/posts/:id
// @desc    Delete post by id
// @access  Private
router.delete("/:id", passport.authenticate("jwt", { session: false }), (req, res) => {
  Post.findById(req.params.id)
    .then((post) => {
      // Check for post owner
      if (post.user.toString() !== req.user.id) {
        return res.status(401).json({ notauthorized: "User not authorized" });
      }
      //if not => Delete
      post.remove().then(() => res.json({ success: true }));
    })
    .catch((err) => res.status(404).json({ postnotfound: "No post found" }));
});

// @route   GET api/posts/user/:user
// @desc    Get all posts of a certen user by his ID
// @access  private
router.get("/user/:user", passport.authenticate("jwt", { session: false }), (req, res) => {
  Post.find({ user: req.params.user })
    .sort({ date: -1 })
    .then((post) => res.json(post))
    .catch((err) => res.status(404).json({ nopostsfound: "No posts found" }));
});

// @route   GET api/posts/currentUser
// @desc    Get all post of the current user
// @access  private
router.get("/currentUser", passport.authenticate("jwt", { session: false }), (req, res) => {
  Post.find({ user: req.user.id })
    .sort({ date: -1 })
    .then((post) => res.json(post))
    .catch((err) => res.status(404).json({ nopostsfound: "No posts found" }));
});

// @route   post api/posts/View/:postId
// @desc    Increament numViews of post by 1
// @access  Public
router.get("/View/:postId", (req, res) => {
  Post.findOneAndUpdate({ _id: req.params.postId }, { $inc: { numViews: 1 } })
    .then((post) => res.json({ numViews: post.numViews }))
    .catch((err) => res.status(404).json({ nopostsfound: "No posts found" }));
});

// @route   GET api/posts/userName/:userName
// @desc    Get all posts of a certen user by userName
// @access  Public
router.get("/userName/:userName", (req, res) => {
  Post.find({ userName: req.params.userName })
    .sort({ date: -1 })
    .then((post) => res.json(post))
    .catch((err) => res.status(404).json({ nopostsfound: "No posts found" }));
});

// @route   GET api/posts/allposts
// @desc    Get all posts in all categories
// @access  Public
router.get("/allposts", (req, res) => {
  Post.find({ status: "active" })
    .sort({ date: -1 })
    .limit() // no limit for now, show all
    .then((posts) => res.json(posts))
    .catch((err) => res.status(404).json({ nopostsfound: "No posts found" }));
});

// @route   GET api/posts/recycling/limit
// @desc    Get only 30 posts in recycling category
// @access  Public
router.get("/recycling/limit", (req, res) => {
  Post.find({ categoryName: "Recycling", status: "active" })
    .sort({ date: -1 })
    .limit(30) // no limit for now, show all
    .then((posts) => res.json(posts))
    .catch((err) => res.status(404).json({ nopostsfound: "No posts found" }));
});

// @route   GET api/posts/volunteering/limit
// @desc    Get only 30 posts in volunteering category
// @access  Public
router.get("/volunteering/limit", (req, res) => {
  Post.find({ categoryName: "Volunteering", status: "active" })
    .sort({ date: -1 })
    .limit(30) // no limit for now, show all
    .then((posts) => res.json(posts))
    .catch((err) => res.status(404).json({ nopostsfound: "No posts found" }));
});

// @route   GET api/posts/donation/limit
// @desc    Get only 30 posts in donation category
// @access  Public
router.get("/donation/limit", (req, res) => {
  Post.find({ categoryName: "Donation", status: "active" })
    .sort({ date: -1 })
    .limit(30) // no limit for now, show all
    .then((posts) => res.json(posts))
    .catch((err) => res.status(404).json({ nopostsfound: "No posts found" }));
});
// ******************************* Update Post ************************************ //

// @route   Post api/posts/update/:id
// @desc    update post
// @access  Private
router.post("/update/:id", passport.authenticate("jwt", { session: false }), (req, res) => {
  Post.findOneAndUpdate(
    { _id: req.params.id },
    {
      title: req.body.title,
      description: req.body.description,
      tags: req.body.tags,
      location: req.body.location,
      categoryName: req.body.categoryName,
      subCategory: req.body.subCategory,
    }
  )
    .then((post) => res.json("post is successfully updated"))
    .catch((err) => res.status(404).json({ nopostfound: "No post found with that ID" }));
});

// @route   Post api/posts/updateStatus/:id
// @desc    update post status
// @access  Public but needs editCode password= "Admin_AWN"
router.post("/updateStatus/:id", (req, res) => {
  if (req.body.editCode == "Admin_AWN") {
    // ****************************************************************** //
    // * in the requist body pass editCode = dmin_AWN to use this route * //
    // ****************************************************************** //
    Post.findOneAndUpdate({ _id: req.params.id }, { status: req.body.status })
      .then((post) => res.json("Post Status is successfully updated"))
      .catch((err) => res.status(404).json({ nopostfound: "No post found with that ID" }));
  } else {
    res.status(404).json({ Error: "System Violation" });
  }
});

// @route   Post api/posts/resetPostLimit
// @desc    reset allowed num posts for users monthly
// @access  Public but needs editCode password= "Admin_AWN"
router.post("/resetPostLimit", (req, res) => {
  const today = new Date();

  if (req.body.editCode == "Admin_AWN") {
    if (today.getDate() == 1) {
      // 1 = first day in month
      RegisteredUse.updateMany({}, { $set: { postLimit: 0 } }).then((user) => res.json("Users' postLimit are reseted to zero"));
    } else {
      res.status(404).json({ notYet: "not the beginning of month." });
    }
  } else {
    res.status(404).json({ Error: "System Violation" });
  }
});

// *******************************************************************************
module.exports = router;
