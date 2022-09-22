const fs = require("fs");
const path = require("path");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const PDFDocument = require("pdfkit");

const Product = require("../models/product");
const Order = require("../models/orders");

const ITEMS_PER_PAGE = 2;

exports.getProducts = (req, res, next) => {
  const { page = 1 } = req.query;

  let totalItems;

  //retriving the number of products
  Product.find()
    .countDocuments()
    .then((numProducts) => {
      totalItems = numProducts;
      return Product.find()
        .skip((page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE);
    })
    .then((products) => {
      res.render("shop/product-list", {
        prods: products,
        pageTitle: "All-products",
        path: "/products",
        currentPage: +page,
        hasNextPage: ITEMS_PER_PAGE * +page < totalItems,
        hasPreviousPage: +page > 1,
        nextPage: +page + 1,
        previousPage: +page - 1,
        lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE), //rounding up 11/2 = 6
      });
    })
    .catch((err) => {
      // res.redirect("/500");
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getProductDetail = (req, res, next) => {
  const { productId } = req.params;
  Product.findById(productId)
    .then((product) => {
      // console.log(products);
      res.render("shop/product-details", {
        product: product,
        pageTitle: product.title,
        path: "/products",
      });
    })
    .catch((err) => {
      // res.redirect("/500");
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getIndex = (req, res, next) => {
  const { page = 1 } = req.query;

  let totalItems;

  //retriving the number of products
  Product.find()
    .countDocuments()
    .then((numProducts) => {
      totalItems = numProducts;
      return Product.find()
        .skip((page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE);
    })
    .then((products) => {
      res.render("shop/index", {
        prods: products,
        pageTitle: "Shop",
        path: "/",
        currentPage: +page,
        hasNextPage: ITEMS_PER_PAGE * +page < totalItems,
        hasPreviousPage: +page > 1,
        nextPage: +page + 1,
        previousPage: +page - 1,
        lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE), //rounding up 11/2 = 6
      });
    })
    .catch((err) => {
      // res.redirect("/500");
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCart = (req, res, next) => {
  req.user
    .populate("cart.items.productId")
    .then((user) => {
      // console.log(user);
      const products = user.cart.items;
      // console.log(products);
      res.render("shop/cart", {
        path: "/cart",
        pageTitle: "Your Cart",
        products: products,
      });
    })
    .catch((err) => {
      // res.redirect("/500");
      // const error = new Error(err);
      // error.httpStatusCode = 500;
      // return next(error);
      console.log(err);
    });
};

exports.postCart = (req, res, next) => {
  const { productId } = req.body;
  Product.findById(productId)
    .then((product) => {
      return req.user.addToCart(product);
    })
    .then((result) => {
      console.log(result);
      res.redirect("/cart");
    });
};

exports.postCartDeleteProduct = (req, res, next) => {
  const { productId } = req.body;
  req.user
    .removeFromCart(productId)
    .then((result) => {
      res.redirect("/cart");
    })
    .catch((err) => {
      // res.redirect("/500");
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCheckout = (req, res, next) => {
  let products;
  let total = 0;

  req.user
    .populate("cart.items.productId")
    .then((user) => {
      // console.log(user);
      products = user.cart.items;
      // console.log(products);
      total = 0;
      products.forEach((p) => {
        total += p.quantity * p.productId.price;
      });

      return stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: products.map((p) => {
          return {
            name: p.productId.title,
            description: p.productId.description,
            amount: p.productId.price * 100,
            currency: "inr",
            quantity: p.quantity,
          };
        }),
        success_url:
          req.protocol + "://" + req.get("host") + "/checkout/success",
        cancel_url: req.protocol + "://" + req.get("host") + "/checkout/cancel",
      });
    })
    .then((session) => {
      res.render("shop/checkout", {
        path: "/checkout",
        pageTitle: "Checkout",
        products: products,
        totalSum: total,
        sessionId: session.id,
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCheckoutSuccess = (req, res, next) => {
  req.user
    .populate("cart.items.productId")
    .then((user) => {
      // console.log(user.cart.items);

      /* using the spread operator 
       not directly on the product ID but on a special field
       mongoose gives me, _doc.
      with .doc we get really access to just the data that's in there
      we pull out all the data in that document we retrieved and store
      it in a new object which we save here as a product */

      const products = user.cart.items.map((i) => {
        return { quantity: i.quantity, product: { ...i.productId._doc } };
      });
      const order = new Order({
        user: {
          email: req.user.email,
          userId: req.user,
        },
        products: products,
      });
      return order.save();
    })
    .then((result) => {
      return req.user.clearCart();
    })
    .then(() => {
      res.redirect("/orders");
    })
    .catch((err) => {
      // res.redirect("/500");
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postOrder = (req, res, next) => {
  req.user
    .populate("cart.items.productId")
    .then((user) => {
      // console.log(user.cart.items);

      /* using the spread operator 
       not directly on the product ID but on a special field
       mongoose gives me, _doc.
      with .doc we get really access to just the data that's in there
      we pull out all the data in that document we retrieved and store
      it in a new object which we save here as a product */

      const products = user.cart.items.map((i) => {
        return { quantity: i.quantity, product: { ...i.productId._doc } };
      });
      const order = new Order({
        user: {
          email: req.user.email,
          userId: req.user,
        },
        products: products,
      });
      return order.save();
    })
    .then((result) => {
      return req.user.clearCart();
    })
    .then(() => {
      res.redirect("/orders");
    })
    .catch((err) => {
      // res.redirect("/500");
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getOrders = (req, res, next) => {
  Order.find({ "user.userId": req.user._id })
    .then((orders) => {
      // console.log(orders);
      res.render("shop/orders", {
        path: "/orders",
        pageTitle: "Your Orders",
        orders: orders,
      });
    })
    .catch((err) => {
      // res.redirect("/500");
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getInvoice = (req, res, next) => {
  const { orderId } = req.params;
  Order.findById(orderId)
    .then((order) => {
      if (!order) {
        return next(new Error("No order found."));
      }
      if (order.user.userId.toString() !== req.user._id.toString()) {
        return next(new Error("Unauthorized"));
      }

      const invoiceName = "invoice-" + orderId + ".pdf";
      const invoicePath = path.join("data", "invoices", invoiceName);

      const pdfDoc = new PDFDocument();
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        'inline; filename="' + invoiceName + '"'
      );

      pdfDoc.pipe(fs.createWriteStream(invoicePath));
      pdfDoc.pipe(res);

      //pdf styling-messages
      pdfDoc.font("Helvetica-Bold").fontSize(29).text("Invoice", {
        underline: true,
        align: "center",
      });

      pdfDoc.text("------------------------------------------------");

      let totalPrice = 0;

      order.products.forEach((prod) => {
        totalPrice += prod.quantity * prod.product.price;
        pdfDoc
          .font("Times-Roman")
          .fontSize(15)
          .text(
            prod.product.title +
              " - " +
              prod.quantity +
              " x " +
              "INR " +
              prod.product.price
          );
      });

      pdfDoc.text("----------------------------------");
      pdfDoc.text("Total Price: INR " + totalPrice);

      //finalizing the pdfDoc
      pdfDoc.end();

      // reading the file all at once
      // fs.readFile(invoicePath, (err, data) => {
      //   if (err) {
      //     return next(err);
      //   }
      //   //setting file type headers
      //   res.setHeader("Content-Type", "application/pdf");
      //   //serving the file
      //   res.setHeader(
      //     "Content-Disposition",
      //     //change inline to attachment if you just want to download the file and not open it
      //     'inline; filename="' + invoiceName + '"'
      //   );
      //   res.send(data);
      // });

      //reading the file in chunks(line by line), buffer gives us access to the chunks
      // const file = fs.createReadStream(invoicePath);

      //headers---------------here

      // //piping/forwarding the readable data to response which is a writable stream
      // file.pipe(res);
    })
    .catch((err) => {
      return next(err);
    });
};
