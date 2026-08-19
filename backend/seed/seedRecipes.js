// Run with: npm run seed
// Wipes existing recipes and inserts a small starter dataset so the
// matching engine has something to rank from day one.

import mongoose from "mongoose";
import dotenv from "dotenv";
import Recipe from "../models/Recipe.js";

dotenv.config();

const recipes = [
  {
    title: "Tomato & Egg Stir Fry",
    ingredients: [
      { name: "tomato", quantity: "2" },
      { name: "egg", quantity: "3" },
      { name: "garlic", quantity: "1 clove" },
      { name: "spring onion", quantity: "1" },
      { name: "salt", quantity: "to taste" },
    ],
    steps: [
      "Beat the eggs and scramble them in a hot pan, then set aside.",
      "Saute garlic, add chopped tomatoes and cook until soft.",
      "Return eggs to the pan, mix, season with salt, garnish with spring onion.",
    ],
    tags: ["vegetarian"],
    source: "seeded",
  },
  {
    title: "Simple Chicken & Rice",
    ingredients: [
      { name: "chicken breast", quantity: "2" },
      { name: "rice", quantity: "1 cup" },
      { name: "onion", quantity: "1" },
      { name: "garlic", quantity: "2 cloves" },
      { name: "salt", quantity: "to taste" },
    ],
    steps: [
      "Cook rice according to package instructions.",
      "Saute onion and garlic, add diced chicken and cook through.",
      "Serve chicken mixture over rice.",
    ],
    tags: [],
    source: "seeded",
  },
  {
    title: "Banana Oat Pancakes",
    ingredients: [
      { name: "banana", quantity: "1" },
      { name: "oats", quantity: "1 cup" },
      { name: "egg", quantity: "2" },
      { name: "milk", quantity: "1/2 cup" },
    ],
    steps: [
      "Blend banana, oats, eggs, and milk until smooth.",
      "Cook spoonfuls of batter on a greased pan until bubbles form, then flip.",
    ],
    tags: ["vegetarian"],
    source: "seeded",
  },
  {
    title: "Garlic Butter Pasta",
    ingredients: [
      { name: "pasta", quantity: "200 g" },
      { name: "garlic", quantity: "3 cloves" },
      { name: "butter", quantity: "2 tbsp" },
      { name: "parmesan", quantity: "1/4 cup" },
    ],
    steps: [
      "Boil pasta until al dente, reserve a little pasta water.",
      "Melt butter, saute garlic until fragrant.",
      "Toss pasta with garlic butter and parmesan, loosen with pasta water if needed.",
    ],
    tags: ["vegetarian"],
    source: "seeded",
  },
  {
    title: "Vegetable Soup",
    ingredients: [
      { name: "carrot", quantity: "2" },
      { name: "potato", quantity: "2" },
      { name: "onion", quantity: "1" },
      { name: "tomato", quantity: "2" },
      { name: "salt", quantity: "to taste" },
    ],
    steps: [
      "Chop all vegetables into small pieces.",
      "Simmer everything in water or stock for 20-25 minutes until soft.",
      "Blend partially or fully depending on preferred texture, season to taste.",
    ],
    tags: ["vegetarian", "vegan"],
    source: "seeded",
  },
];

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB for seeding...");

    await Recipe.deleteMany({ source: "seeded" });
    await Recipe.insertMany(recipes);

    console.log(`Seeded ${recipes.length} recipes successfully.`);
    process.exit(0);
  } catch (err) {
    console.error("Seeding failed:", err);
    process.exit(1);
  }
};

run();
