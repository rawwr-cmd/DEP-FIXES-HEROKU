const express = require("express");
const { body } = require("express-validator");

// const rootDir = require("../util/path");
const {
  getAddProduct,
  postAddProduct,
  getProducts,
  getEditProduct,
  postEditProduct,
  deleteProduct,
} = require("../controllers/admin");

const isAuth = require("../middleware/is-auth");

const router = express.Router();

// // /admin/add-product => GET
router.get("/add-product", isAuth, getAddProduct);
router.get("/products", isAuth, getProducts);

// // /admin/add-product => POST
router.post(
  "/add-product",
  [
    body("title").isString().isLength({ min: 3 }).trim(),
    body("price").isFloat(),
    body("description").isLength({ min: 20, max: 400 }).trim(),
  ],
  isAuth,
  postAddProduct
);

// // /admin/edit-product/:productId => GET
router.get("/edit-product/:productId", isAuth, getEditProduct);

router.post(
  "/edit-product",
  [
    body("title").isString().isLength({ min: 3 }).trim(),
    body("price").isFloat(),
    body("description").isLength({ min: 20, max: 400 }).trim(),
  ],
  isAuth,
  postEditProduct
);

router.delete("/product/:productId", isAuth, deleteProduct);

module.exports = router;
