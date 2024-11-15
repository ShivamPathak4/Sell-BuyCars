const express = require("express");
const requireLogin = require("../middlewares/auth.js");
const { CarModel } = require("../models/PostCarmodel.js");
const { UserModel } = require("../models/user.js");
// const { Oem_model } = require("../models/oemSpecs.js");

const PostCarRoute = express.Router();

// Post a second-hand car with details

PostCarRoute.post("/addcar", requireLogin, async (req, res) => {
  const {
    images,
    Original_Paint,
    tags,
    Number_of_previous_buyers,
    Registration_Place,
    KMs_on_Odometer,
    Major_Scratches,
    price,
    car_Manufacturer,
    model,
    year,
  } = req.body;
  if (
  images.length === 0 || 
    !Original_Paint ||
    tags.length===0 ||
    !Number_of_previous_buyers ||
    !Registration_Place ||
    !KMs_on_Odometer ||
    !Major_Scratches ||
    !price ||
    !car_Manufacturer ||
    !model ||
    !year
  ) {
    return res.status(422).json({ error: "Please Add All the fields...!" });
  }
  console.log("user", req.user);

  const addCar = new CarModel({
    images,
    Original_Paint,
    tags,
    Number_of_previous_buyers,
    Registration_Place,
    KMs_on_Odometer,
    Major_Scratches,
    price,
    car_Manufacturer,
    model,
    year,
    postedBy: req.user._id,
    name: req.user.name,
  });

  addCar
    .save()
    .then((result) => {
      return res
        .status(200)
        .json({ post: result, msg: "Car Added Successfully...!" });
    })
    .catch((err) => console.log(err));
});

// Get the post of logged in user only
PostCarRoute.get("/getpost/:id", async (req, res) => {
  const id = req.params.id;
  UserModel.findById(id)
    .select("-password") // remove password
    .then((user) => {
      CarModel.find({ postedBy: id })
        .then((post, err) => {
          if (err) {
            return res.status(422).json({ error: err });
          }
          res.status(200).json({ user, post });
        })
        .catch((err) => {
          return res.status(422).json({ error: "User Not Found" });
        });
    });
});



// Update data by dealers
PostCarRoute.patch("/updatedata/:id", async (req, res) => {
  const id = req.params.id;
  const payload = req.body;
  console.log(req.body);
  try {
    const data = await CarModel.findByIdAndUpdate({ _id: id }, payload);
    res.send({ message: "Product Details Updated!", oldProductDetais: data });
  } catch (err) {
    res.send({ message: "Something went Wrong!", error: err.message });
  }
});

// Delete Post //
PostCarRoute.delete("/deletepost/:postId", requireLogin, async (req, res) => {
  const id = req.params.postId;
  console.log(id);
  await CarModel.findById(id)
    .then((post, err) => {
      if (err || !post) {
        return res.status(422).json({ error: err });
      }
      if (post.postedBy.toString() == req.user._id.toString()) {
        CarModel.findByIdAndDelete(id)
          .then((result) => {
            return res.json({ msg: "Successfully DELETED" });
          })
          .catch((err) => {
            console.log(err);
          });
      } else {
        return res
          .status(422)
          .json({ msg: "You are not Authorized to delete this Post" });
      }
    })
    .catch((err) => {
      console.log(err);
    });
});

// get all the post posted by all the dealers/users

PostCarRoute.get("/getdata", async (req, res) => {
  try {
    let data = await CarModel.find();
    res.status(200).send(data);
  } catch (error) {
    res.send(error.message);
  }
});

// characters search
PostCarRoute.get("/searchcars", async (req, res) => {
  const { query } = req.query;

  try {
    // Constructing the search query dynamically
    const searchQuery = {
      $or: [
        { tags: { $regex: query, $options: "i" } }, // Search by tags
        { car_Manufacturer: { $regex: query, $options: "i" } }, // Search by car manufacturer
        { model: { $regex: query, $options: "i" } }, // Search by model
        { Registration_Place: { $regex: query, $options: "i" } }, // Search by registration place
        { price: isNaN(query) ? undefined : Number(query) }, // Search by price (if numeric)
      ],
    };

    // Remove undefined conditions from the query
    searchQuery.$or = searchQuery.$or.filter((condition) => !Object.values(condition).includes(undefined));

    // Perform the search in the database
    const posts = await CarModel.find(searchQuery);

    if (posts.length === 0) {
      return res.status(404).json({ error: "No posts found matching the search criteria" });
    }

    res.status(200).json({ post: posts });
  } catch (err) {
    console.error("Error in global search:", err);
    res.status(500).json({ error: "An error occurred while searching for cars" });
  }
});


// get data of a particular post that is by id  for description purpose  //
PostCarRoute.get("/getdatabyid/:postId", async (req, res) => {
  const postId = req.params.postId;

  try {
    let data = await CarModel.findById({ _id: postId });
    console.log(data);
    if (data) {
        return res.status(201).send({ data: data});
      }
    }
  catch (err) {
    console.log(err);
  }
});

module.exports = { PostCarRoute };
