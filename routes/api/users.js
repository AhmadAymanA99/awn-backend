const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Keys = require("../../config/Keys");
const router = express.Router();
const passport = require("passport");
const User = require("../../models/User.js").RegisteredUser;
const Report = require("../../models/Report");
const Post = require("../../models/Post");
const Admin = require("../../models/User.js").Admin;
const isEmpty = require("../../validation/is-empty");
const gravatar = require("gravatar");
const validateRegisterUserInput = require("../../validation/register").validateRegisterUserInput;
const validateLoginUserInput = require("../../validation/login").validateLoginUserInput;
const nodemailer = require("nodemailer");
router.get("/test", (req, res) => res.json({ msg: "Users hahaah" }));
router.get("/getUser/:userName", (req, res) => {
  User.findOne({ userName: req.params.userName })
    .then((data) => {
      if (!data) {
        return res.status(404).json({ user: "User not found !!" });
      }

      return res.json({ userName: data.userName, name: data.name, rate: data.rate, email: data.email, phoneNumber: data.phone });
    })
    .catch((err) => console.log(err));
});
//delete (user data and his posts and the reports on him) after one month
//userData.created = Date.now() + 30000;
//seperate
// userData.created = undefined;
router.post("/deactivate", passport.authenticate("jwt", { session: false }), (req, res) => {
  var datePlusOneMonth = new Date();
  datePlusOneMonth.setMonth(datePlusOneMonth.getMonth() + 1);

  User.updateOne({ _id: req.user.id }, { $set: { created: datePlusOneMonth } })
    .then(() => {
      Post.updateMany({ user: req.user.id }, { $set: { created: datePlusOneMonth } }, function (err, result) {
        if (err) {
          console.log(err);
          res.json(err);
        } else {
          Report.updateMany({ reportedUserID: req.user.id }, { $set: { created: datePlusOneMonth } }, function (err, result) {
            if (err) {
              console.log(err);
              res.json(err);
            } else {
              res.json({ msg: "User deactivated .. " });
            }
          });
        }
      });
    })
    .catch((err) => {
      console.log(err);
      res.json(err);
    });
});
router.post("/register", (req, res) => {
  req.body.password = req.headers.authorization;
  req.body.password2 = req.headers.authorization;
  const { errors, isValid } = validateRegisterUserInput(req.body);
  if (!isValid) {
    return res.status(404).json(errors);
  }

  User.find(
    {
      $or: [{ email: req.body.email }, { phone: req.body.phone }, { userName: req.body.userName }],
    },
    function (err, doc) {
      if (!isEmpty(doc)) {
        for (let i = 0; i < doc.length; i++) {
          // max 3 iterates
          if (doc[i].email === req.body.email) {
            errors.email = "The Same Email Used before";
          }
          if (doc[i].phone === req.body.phone) {
            errors.phone = "The Same Phone Number Used before";
          }
          if (doc[i].userName === req.body.userName) {
            errors.userName = "The Same User Name Used before";
          }
        }

        return res.status(400).json(errors);
      }
      const avatar = gravatar.url(
        req.body.email,
        {
          s: "200",
          r: "pg",
          d: "mm",
        },
        true
      );
      const newuser = new User({
        name: req.body.name,
        userName: req.body.userName,
        email: req.body.email,
        password: req.body.password,
        phone: req.body.phone,
        avatar,
      });

      bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(newuser.password, salt, (err, hash) => {
          if (err) throw err;
          newuser.password = hash;
          const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
              user: Keys.confirmationEmail,
              pass: Keys.confirmationPassword,
            },
          });
          var url = `https://awn-app.herokuapp.com/email/confirmation/${newuser._id}/${newuser.activationTokenEmail}`;
          var mailOptions = {
            from: Keys.confirmationEmail,
            to: newuser.email,
            subject: "AWN Confirmation Email",
            text: `Please click here ${url}`,
          };

          transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
              console.log(error);
              return res.status(500).json({ msg: "email did not send correctly" });
            } else {
              newuser
                .save()
                .then((user) => {
                  return res.status(200).json(user);
                })
                .catch((err) => res.json(err));
            }
          });
        });
      });
    }
  );
});
//public send in body two (token,userId)
router.post("/confirmEmail", (req, res) => {
  User.findById(req.body.id)
    .then((data) => {
      if (data.activationTokenEmail == req.body.token) {
        data.confirmationEmail = true;
        data.save();
        return res.json({ msg: "confirmed" });
      } else {
        return res.status(404).json({ msg: "did not activate" });
      }
    })
    .catch((err) => console.log(err));
});
//private get token + id of user you want to rate + rate
router.post("/rate", passport.authenticate("jwt", { session: false }), (req, res) => {
  // console.log("here1");
  if (req.body.rate >= 0 && req.body.rate <= 5) {
    User.findOne({ userName: req.body.userName })
      .then((data) => {
        //console.log("here2");
        var index = -1,
          rate = 0;

        data.peopleRatedMe.forEach((element, i) => {
          if (element.userName == req.user.userName) {
          }
          index = i;
          rate += data.peopleRatedMe[i].rate;
        });
        if (index == -1) {
          data.peopleRatedMe.push({ userName: req.user.userName, rate: req.body.rate });
          rate += req.body.rate;
          data.rate = rate / data.peopleRatedMe.length;
        } else {
          rate -= data.peopleRatedMe[index].rate;
          data.peopleRatedMe[index] = { userName: req.user.userName, rate: req.body.rate };
          rate += req.body.rate;
          data.rate = rate / data.peopleRatedMe.length;
        }
        data.save();
        res.json({ msg: "rated successfully" });
      })
      .catch((err) => console.log(err));
  } else {
    res.status(422).json({ msg: "wrong numbers" });
  }
});
router.post("/login", (req, res) => {
  req.body.password = req.headers.authorization;
  var { logindata, errors, isValid } = validateLoginUserInput(req.body);
  if (!isValid) {
    return res.status(400).json(errors);
  }

  User.findOne(logindata).then((user) => {
    if (!user) {
      return res.status(404).json({ user: "User not found !!" });
    }
    bcrypt.compare(req.body.password, user.password).then((ismatch) => {
      if (ismatch) {
        const payload = { id: user.id, type: user.isAdmin };
        jwt.sign(payload, Keys.secretOrKey, { expiresIn: 60 * 60 * 24 * 30 }, (err, token) => {
          var temp_user = {
            userName: user.userName,
            email: user.email,
            phoneNumber: user.phone,
            rate: user.rate,
            name: user.name,
          };
          if (user.isBaaned) {
            return res.status(403).json({ msg: "this user is banned" });
          }
          if (!user.confirmationEmail) {
            return res.status(401).json({ msg: "this user is Unauthorized" });
          }

          //if user deactivated he will be activate from here

          User.findById(user._id).then((userData) => {
            Post.updateMany({ user: user._id }, { $unset: { created: undefined } }, function (err, result) {
              if (err) {
                console.log(err);
                res.json(err);
              } else {
                Report.updateMany({ reportedUserID: user._id }, { $unset: { created: undefined } }, function (err, result) {
                  if (err) {
                    console.log(err);
                    res.json(err);
                  } else {
                    userData.created = undefined;
                    userData.save();
                    user = temp_user;
                    res.status(200).json({ user, success: true, token: "Bearer " + token });
                  }
                });
              }
            });
          });
        });
      } else {
        return res.status(404).json({ password: "password incorrect" });
      }
    });
  });
});
router.post("/userChangePassword", passport.authenticate("jwt", { session: false }), (req, res) => {
  //token + password

  bcrypt.genSalt(10, (err, salt) => {
    bcrypt.hash(req.body.password, salt, (err, hash) => {
      if (err) throw err;

      var myquery = { _id: req.user._id };
      var newvalues = { $set: { password: hash } };
      User.updateOne(myquery, newvalues, function (err, affected) {
        if (err) {
          console.log("update document error");
          return res.json(err);
        } else {
          console.log("password changed");
          return res.status(200).json({ msg: "password changed" });
        }
      });
    });
  });
});
router.get("/userInfo/:id", (req, res) => {
  User.findById(req.params.id)
    .then((data) => {
      if (data) {
        return res.status(200).json({
          username: data.userName,
          Phonenumber: data.phone,
          rating: data.rate,
          email: data.email,
        });
      }
      return res.status(404).json({ msg: "User not found" });
    })
    .catch((err) => console.log(err));
});
//not working right now
router.post("/reportUser", passport.authenticate("jwt", { session: false }), (req, res) => {
  const newreportUser = new Report({
    reportFlag: true,
    reporterID: req.user.id,
    reportedUserID: req.body.reportedUserID,
    description: req.body.description,
  });
  newreportUser
    .save()
    .then((report) => res.json(report))
    .catch((err) => res.json(err));
  // res.json(req.data);
});

router.post("/reportPost", passport.authenticate("jwt", { session: false }), (req, res) => {
  //postId + Description + token of user
  //reportFlag false & reporterID req.user.id &
  //check if there is report with the same reporter at the same post
  Report.find(
    {
      $and: [{ reportFlag: false }, { reporterID: req.user.id }, { postID: req.body.postID }],
    },
    function (err, doc) {
      if (!isEmpty(doc)) {
        return res.status(400).json({ msg: "your report did not reviewd yet to the admin." });
      }
      //get the admin to assign report to .and then save thee report
      var admin = { numberofAssignedReport: 0 };
      Admin.find({}, (err, admins) => {
        if (admins.length == 0) {
          return res.status(404).json({ msg: "there is no admins in data base" });
        }
        admin = admins[0];
        for (var i = 0; i < admins.length; i++) {
          if (admins[i].numberofAssignedReport <= admin.numberofAssignedReport) {
            admin = admins[i];
          }
        }
        const newreportPost = new Report({
          adminId: admin.id,
          reportFlag: false,
          reporterID: req.user.id,
          postID: req.body.postID,
          description: req.body.description,
        });
        newreportPost
          .save()
          .then(() => {
            Admin.findOneAndUpdate({ _id: admin.id }, { $inc: { numberofAssignedReport: 1 } }, (a, b) => {
              res.json({ msg: "reported successfully" });
            });
          })
          .catch((err) => res.json(err));
      });
    }
  );
});
//not working right now
router.post("/reportPost3bdalla", (req, res) => {
  //postId + Description + id of user
  //reportFlag false & reporterID req.user.id &
  //check if there is report with the same reporter at the same post
  Report.find(
    {
      $and: [{ reportFlag: false }, { reporterID: req.body.id }, { postID: req.body.postID }],
    },
    function (err, doc) {
      if (!isEmpty(doc)) {
        return res.status(400).json({ msg: "your report did not reviewd yet to the admin." });
      }
      //get the admin to assign report to .and then save thee report
      var admin = { numberofAssignedReport: 0 };
      Admin.find({}, (err, admins) => {
        if (admins.length == 0) {
          return res.status(400).json({ msg: "there is no admins in data base" });
        }

        for (var i = 0; i < admins.length; i++) {
          if (admins[i].numberofAssignedReport <= admin.numberofAssignedReport) {
            admin = admins[i];
          }
        }
        const newreportPost = new Report({
          adminId: admin.id,
          reportFlag: false,
          reporterID: req.body.id,
          postID: req.body.postID,
          description: req.body.description,
        });
        newreportPost
          .save()
          .then(() => {
            Admin.findOneAndUpdate({ _id: admin.id }, { $inc: { numberofAssignedReport: 1 } }, (a, b) => {});
            res.json({ msg: "reported successfully" });
          })
          .catch((err) => res.json(err));
      });
    }
  );
});
module.exports = router;
