const express = require("express");
const { check, body } = require("express-validator");

const User = require("../models/user");

const {
  getLogin,
  postLogin,
  postLogout,
  getSignup,
  postSignup,
  getReset,
  postReset,
  getNewPassword,
  postNewPassword,
} = require("../controllers/auth");

const router = express.Router();

router.get("/login", getLogin);
router.get("/signup", getSignup);

router.post(
  "/login",
  [
    body("email")
      .isEmail()
      .withMessage("Please enter a valid email address.")
      .normalizeEmail(),
    body("password", "Password has to be valid.")
      .isLength({ min: 5 })
      .isAlphanumeric()
      .trim(),
  ],
  postLogin
);

router.post(
  "/signup",
  [
    check("email")
      .isEmail()
      .withMessage("Please enter a valid email")
      //custom validator to check if email already exists
      .custom((value, { req }) => {
        // if (value === "test01@gmail.com") {
        //   throw new Error("This email address is forbidden.");
        // }
        // return true;
        return User.findOne({ email: value }).then((userDoc) => {
          if (userDoc) {
            return Promise.reject(
              "E-mail exists already, pick a different one"
            );
          }
        });
      })
      .normalizeEmail(),
    body(
      "password",
      "Please enter a password with only numbers and text and at least 5 characters."
    )
      .isLength({ min: 5 })
      .isAlphanumeric()
      .trim(), //for removing white spaces
    body("confirmPassword")
      .trim()
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error("Password doesn't match!");
        }
        return true;
      }),
  ],
  postSignup
);

router.post("/logout", postLogout);

router.get("/password-reset", getReset);
router.post("/password-reset", postReset);

router.get("/password-reset/:token", getNewPassword);

router.post("/new-password", postNewPassword);

module.exports = router;
