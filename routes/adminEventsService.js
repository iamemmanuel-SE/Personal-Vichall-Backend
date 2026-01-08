import express from "express";
const router = express.Router();

//POST SINGLE Event
router.post("/:id", (req, res) => {
  res.json({ message: "Post a single event" });
});


export default router;
