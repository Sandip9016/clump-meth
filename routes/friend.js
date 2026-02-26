const express = require("express");
const auth = require("../middleware/auth");
const {
  addFriend,
  userList,
  rejectFrndRequest,
  acceptFrndRequest,
  searchUser,
  friendRequestList,
  deleteFriendship,
  deleteAllFriendship,
  myFriendList,
  deleteFriendshipByUser,
  top10CountryList,
  top10GlobalList,
  top100FriendList,
} = require("../controller/friend");
const router = express.Router();

router.post("/add-friend", auth, addFriend);
router.post("/accept-friend", auth, acceptFrndRequest);
router.post("/reject-friend", auth, rejectFrndRequest);
router.post("/search-user-list", auth, searchUser);

router.get("/my-friend-list", auth, myFriendList);
router.get("/alluser-list", auth, userList);
router.get("/top10-country-list", auth, top10CountryList);
router.get("/top10-global-list", auth, top10GlobalList);
router.get("/top100-friend-list", auth, top100FriendList);
router.get("/friend-request", auth, friendRequestList);

router.delete("/deleteFriendShipByUser", auth, deleteFriendshipByUser);

router.delete("/delete-friend-request/:friendshipId", auth, deleteFriendship);
router.delete("/delete-sab-frndreq", deleteAllFriendship);

module.exports = router;
