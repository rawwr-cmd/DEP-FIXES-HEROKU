const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const orderSchema = new Schema({
  products: [
    {
      product: { type: Object, required: true },
      quantity: { type: Number, required: true },
    },
  ],
  user: {
    email: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
  },
});

module.exports = mongoose.model("Order", orderSchema);

//   addOrder() {
//     const db = getDb();
//     return this.getCart()
//       .then((products) => {
//         const order = {
//           items: products,
//           user: {
//             _id: new ObjectId(this._id),
//             name: this.name,
//           },
//         };
//         return db.collection("orders").insertOne(order);
//       })
//       .then((result) => {
//         //emptying the cart after ordering
//         this.cart = { items: [] };
//         //emptying the cart from the database
//         return db.collection("users").updateOne(
//           { _id: new ObjectId(this._id) }, //searching for the user
//           { $set: { cart: { items: [] } } }
//         );
//       });
//   }
