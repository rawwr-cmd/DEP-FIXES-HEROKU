if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const path = require("path");
const fs = require("fs");

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const mongoDbStore = require("connect-mongodb-session")(session);
const csrf = require("csurf");
const flash = require("connect-flash");
const multer = require("multer");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");

const { get404, get500 } = require("./controllers/error");
const User = require("./models/user");

const app = express();
const store = new mongoDbStore({
  uri: process.env.DB_URL,
  collection: "sessions",
});

const csrfProtection = csrf();

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg"
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

app.set("view engine", "ejs");
// app.set("view engine", "pug");
app.set("views", "views");

//routes
const adminRoutes = require("./routes/admin");
const shopRoutes = require("./routes/shop");
const authRoutes = require("./routes/auth");

//a for append
const accessLogStream = fs.createWriteStream(
  path.join(__dirname, "access.log"),
  { flags: "a" }
);

const scriptSrcUrls = ["https://js.stripe.com/v3/"];
const styleSrcUrls = ["https://fonts.googleapis.com/"];
const connectSrcUrls = [
  "https://events.mapbox.com",
  "https://res.cloudinary.com/dv5vm4sqh/",
];
const fontSrcUrls = ["https://fonts.gstatic.com"];

app.use(
  helmet.contentSecurityPolicy({
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", ...connectSrcUrls],
      scriptSrc: [
        "'unsafe-inline'",
        "'unsafe-eval'",
        "'self'",
        ...scriptSrcUrls,
      ],
      styleSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", ...styleSrcUrls],
      workerSrc: ["'self'", "blob:"],
      objectSrc: [],
      imgSrc: ["'self'", "blob:", "data:"],
      fontSrc: ["'self'", ...fontSrcUrls],
      mediaSrc: ["https://res.cloudinary.com/dv5vm4sqh/"],
      childSrc: ["blob:"],
      frameSrc: ["blob:", "https://js.stripe.com/v3/"],
      upgradeInsecureRequests: [],
    },
  })
);

"https://api.mapbox.com", app.use(compression());
app.use(morgan("combined", { stream: accessLogStream }));

const sessionConfig = {
  store: store,
  secret: "my secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    name: "session",
    httpOnly: true,
    // secure: true,
    expires: Date.now() + 8 * 24 * 60 * 60 * 1000,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
};

app.use(bodyParser.urlencoded({ extended: false }));
app.use(
  multer({ storage: fileStorage, fileFilter: fileFilter }).single("image")
);

app.use(express.static(path.join(__dirname, "public")));
//serving images statically
app.use("/images", express.static(path.join(__dirname, "images")));

app.use(session(sessionConfig));
app.use(csrfProtection);
app.use(flash());

//middleware
app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.csrfToken = req.csrfToken();
  next();
});

app.use((req, res, next) => {
  if (!req.session.user) {
    return next();
  }
  User.findById(req.session.user._id)
    .then((user) => {
      if (!user) {
        return next();
      }
      req.user = user;
      next();
    })
    .catch((err) => {
      next(new Error(err));
    });
});

app.use("/admin", adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.get("/500", get500);
app.use(get404);

app.use((error, req, res, next) => {
  // res.redirect("/500");
  res.status(500).render("500", {
    pageTitle: "Error!",
    path: "/500",
    isAuthenticated: req.session.isLoggedIn,
  });
});

const port = process.env.PORT || 4000;

mongoose
  .connect(process.env.DB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then((result) => {
    app.listen(port, () => {
      console.log(`The application is running on localhost ${port}`);
    });
  })
  .catch((err) => {
    console.error(err);
  });
