const express = require("express");
const auth = require("../middleware/auth");
const {
  addFriend,
  acceptFrndRequest,
  rejectFrndRequest,
  searchUser,
  myFriendList,
  userList,
  friendRequestList,
} = require("../controller/friend");
const router = express.Router();

router.post("/add-friend", auth, addFriend);
router.post("/accept-friend", auth, acceptFrndRequest);
router.post("/reject-friend", auth, rejectFrndRequest);
router.post("/search-user-list", auth, searchUser);

router.get("/my-friend-list", auth, myFriendList);
router.get("/alluser-list", auth, userList);
router.get("/friend-request", auth, friendRequestList);

module.exports = router;
