const productModel = require("../models/productModel");
const userModel = require("../models/userModel");
const cartModel = require("../models/cartModel");

const { isValidBody, isValidObjectId, isValid } = require("../validator/validate");


//______________________________ Create Cart ____________________________________//

const createCart = async function (req, res) {
  try {
    let userIdByParams = req.params.userId;
    let requestBody = req.body;
    let userIdbyToken = req.userId;

    const { productId, cartId } = requestBody;

    if (!isValidObjectId(userIdByParams)) {
      return res.status(400).send({ status: false, msg: "userId is invalid" });
    }

    const userByuserId = await userModel.findById(userIdByParams);

    if (!userByuserId) {
      return res.status(404).send({ status: false, message: "user not found." });
    }

    //authorization:-
    if (userIdbyToken != userIdByParams) {
      return res.status(403).send({ status: false, message: "Unauthorized access." });
    }

    if (!isValid(productId)) {
      return res.status(400).send({ status: false, message: "productId is required" });
    }

    if (!isValidObjectId(productId)) {
      return res.status(400).send({ status: false, message: "productId is not valid" });
    }

    let findProduct = await productModel.findOne({ _id: productId, isDeleted: false });

    if (!findProduct) {
      return res.status(400).send({ status: false, message: "product is not found" });
    }

    let existCart = await cartModel.findOne({ userId: userIdByParams });

    if (!existCart) {

              let newCart = {
              productId: findProduct._id,
              quantity: 1,
            };

          productPrice = findProduct.price * newCart.quantity;

          let createCart = await cartModel.create({
          userId: userIdByParams, items: newCart, totalPrice: productPrice,
          totalItems: 1,
         });

        return res.status(201).send({ status: true, message: "The cart is Created successfully", data: createCart });

    }

    if (existCart) {
         if (!cartId) {
           return res.status(400).send({ status: false, message: "please enter cart id" });
          }
      
           if (!isValidObjectId(cartId)) {
           return res.status(400).send({ status: false, message: "Invalid cart id" });
         }
      
         let findUserFromCart = await cartModel.findById(cartId);
         if (!findUserFromCart) {
         return res.status(404).send({ status: false, message: "Cart not found" });
       }

        if (userIdbyToken !== findUserFromCart.userId.toString())
        return res.status(403).send({
          status: false,
          message: "Not authorized to update this cart",
        });

       let findProduct = await productModel.findOne({
        _id: productId,
        isDeleted: false,
       });
      
        const newTotalPrice = existCart.totalPrice + findProduct.price * 1;
      
       let flag = 0;
      
       const items = existCart.items;
      
      for (let i = 0; i < items.length; i++) {
      if (items[i].productId.toString() === productId) 
        {
           items[i].quantity = items[i].quantity + 1;

          var newCartData = {
            items: items,
            totalPrice: newTotalPrice,
            quantity: 1,
         };
          flag = 1;
          console.log("Add old productId")
          const saveData = await cartModel.findOneAndUpdate({ userId: userIdByParams }, newCartData, {new: true})
            .populate({
              path: "items.productId",
              select: "title price productImage -_id ",
            });

          return res.status(201).send({status: true,message: "Success",data: saveData});
        }
     }
      if (flag === 0) {
        console.log("Add new productId")

        let addItems = {
          productId: productId,
          quantity: 1,
        };
        const saveData = await cartModel.findOneAndUpdate(
          { userId: userIdByParams },
          {
            $addToSet: { items: addItems },
            $inc: { totalItems: 1, totalPrice: findProduct.price * 1 },
          },
          { new: true, upsert: true }
        );

        return res.status(201).send({
          status: true,
          message: "product added to the cart successfully",
          data: saveData,
        });
      }
    }
  } catch (error) {
    return res.status(500).send({ status: false, message: error.message });
  }
};

//_______________________________________ Remove Cart   ____________________________________________//

const updateCart = async function (req, res) {
  try {
    let userIdByparam = req.params.userId
    let userIdbytoken = req.userId
    let data = req.body
    let { cartId, productId, removeProduct } = data


    //using authorization :-
    if (userIdByparam != userIdbytoken) {
      return res.status(403).send({ status: false, message: "unauthorised  user..." })
    }
    
    if (!isValidBody(data)){
      return res.status(400).send({status:false,message:"Body can't be empty , Enter some data"})
    }

    // when the remove product is equall 1 the it's remove one by one :-
    if (removeProduct == 1) {
      let cart = await cartModel.findOne({ _id: cartId, "items.productId": productId })
      if (!cart) return res.status(400).send({ status: false, message: "product is already deleted" })
      let array = cart.items
      let totalQuantity = 0
      for (let i = 0; i < array.length; i++) {
        if (array[i].productId == productId) {
          totalQuantity = array[i].quantity
        }
      }

      totalQuantity-- ;  // totalQuantity is decrease by one 

     // by the decreasing when totalQuantity is equall to zero , the specific item will remove :- 
      if (totalQuantity == 0) {
        let product = await productModel.findOne({ _id: productId, isDeleted: false })

        let updatecart = await cartModel.findOneAndUpdate({ _id: cartId },
          {
            $pull: { items: { "productId": productId } },             //$pull will remove the entire object whenever condition is match
            $inc: { totalItems: -1, totalPrice: -product.price }
          }, { new: true })

        return res.status(201).send({ status: true, message: "Item deleted successfully", data: updatecart })

      }
      // when totalQuantity is not equal to zero  
      let product = await productModel.findOne({ _id: productId, isDeleted: false })
      let updateCart = await cartModel.findOneAndUpdate({ _id: cartId, "items.productId": productId },
        { $inc: { "items.$.quantity": -1, totalPrice: -product.price } },
        { new: true })

      return res.status(201).send({ status: true, message: "product quantity remove successfully", data: updateCart })
    }

    if (removeProduct == 0) {
      let product = await productModel.findOne({ _id: productId, isDeleted: false })
      let cart = await cartModel.findOne({ _id: cartId, "items.productId": productId })
      if (!cart) return res.status(400).send({ status: false, message: "product is already deleted" })

      let productQuantity = 0
      let arr = cart.items
      for (let i = 0; i < arr.length; i++) {
        if (arr[i].productId == productId) {
          productQuantity = arr[i].quantity

        }
      }
      console.log(productQuantity)

      let updatecart = await cartModel.findOneAndUpdate({ _id: cartId },
        {
          $pull: { items: { "productId": productId } },             //$pull will remove the entire object whenever condition is match
          $inc: { totalItems: -1, totalPrice: -product.price * productQuantity }
        }, { new: true })

      return res.status(200).send({ status: true, data: updatecart })
    }
  }
  catch (err) {
    return res.status(500).send({ status: false, message: err.message })
  }
}

//____________________________________  Get Cart   _____________________________________________//

const getCart = async function (req, res) {
  try {

    let userIdByparam = req.params.userId;
    let userIdbytoken = req.userId


    if (!userIdByparam)
      return res.status(400).send({ status: false, message: "plz enter the userId" });
    
    if (!isValid(userIdByparam))
      return res.status(400).send({ status: false, message: "incorrect userId userId" });
    
    if (!isValidObjectId(userIdByparam))
      return res.status(400).send({ status: false, message: "incorrect userId" });
    
    
    let user = await userModel.findById(userIdByparam);

    
    if (!user) return res.status(404).send({ status: false, message: "user not found" });

    //authorization :-
    if (userIdbytoken != userIdByparam)
      return res.status(403).send({ status: false, message: "Not Authorised" });

    let cart = await cartModel.findOne({ userIdByparam }).populate([
        { path: "items.productId", select: "title price productImage -_id" }]);

    if (!cart){
      return res.status(404).send({ status: false, message: "Cart not found for this user" });
    }

    return res.status(200).send({ status: true, message: "Success", data: cart });

  } catch (err) {
    return res.status(500).send({ status: false, message: err.message });
  }
};

//_________________________________ Delete Cart _________________________________________//

const deleteCartById = async function (req, res) {
  try {
    let userId = req.params.userId;
    const userCart = await cartModel.findOne({ userId: userId });
    if (!isValidObjectId(userId)) {
      return res.status(400).send({ status: false, messgage: `Invalid ID!` });
    }

    if (req.userId != userId)
      return res.status(403).send({ status: false, message: `Not Authorised user` });

    if (userCart.items.length === 0) {
      return res.status(400).send({ status: false, message: `Cart not created with this id` });
    }
    if (!userCart) {
      return res.status(404).send({ status: false, message: `No Cart Found!` });
    }
    const deleteCart = await cartModel.findOneAndUpdate({ userId: userId },
      { $set: { totalItems: 0, totalPrice: 0, items: [] } },
      { new: true });

    return res.status(204).send({ status: true, message: `success`, data: deleteCart });

  } catch (error) {
    res.status(500).send({ status: false, error: error.message });
  }
};


//_____________________________ Exports Modules _________________________________//

module.exports = { createCart, updateCart, getCart, deleteCartById };
