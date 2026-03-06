const Friend = require("../models/Friend");
const Player = require("../models/Player");
const admin = require("../config/firebase");
const { memoryStorage } = require("multer");
const axios = require("axios");

exports.addFriend = async (req, res) => {
  try {
    const requester = req.user._id; // ✅ from token
    const { recipient } = req.body;

    if (!recipient) {
      return res.status(400).json({
        success: false,
        message: "Recipient is missing",
      });
    }

    if (requester.toString() === recipient) {
      return res.status(400).json({
        success: false,
        message: "You cannot add yourself as friend",
      });
    }

    const existUser = await Player.findById(recipient);
    if (!existUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Already friends?
    const alreadyFriend = await Friend.findOne({
      $or: [
        { requester, recipient, status: "accepted" },
        { requester: recipient, recipient: requester, status: "accepted" },
      ],
    });

    if (alreadyFriend) {
      return res.status(400).json({
        success: false,
        message: "You are already friends",
      });
    }

    // Already requested?
    const alreadyRequested = await Friend.findOne({
      $or: [
        { requester, recipient, status: "pending" },
        { requester: recipient, recipient: requester, status: "pending" },
      ],
    });

    if (alreadyRequested) {
      return res.status(400).json({
        success: false,
        message: "Friend request already exists",
      });
    }

    await Friend.create({
      requester,
      recipient,
      status: "pending",
    });

    // Push notification
    const receiver = await Player.findById(recipient);
    const sender = await Player.findById(requester);

    if (receiver?.fcmToken) {
      await admin.messaging().send({
        token: receiver.fcmToken,
        notification: {
          title: "New Friend Request 🎉",
          body: `${sender.username} sent you a friend request.`,
        },
        data: {
          type: "FRIEND_REQUEST",
          requester: requester.toString(),
          recipient: recipient.toString(),
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: "Friend request sent",
    });
  } catch (error) {
    console.log("error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.acceptFrndRequest = async (req, res) => {
  try {
    const { requester, recipient } = req.body;

    // check if user is already a dost friend

    const alreadyFrnd = await Friend.findOne({
      $or: [
        { requester, recipient, status: "accepted" },
        { requester: recipient, recipient: requester, status: "accepted" },
      ],
    });

    console.log("alrdyfrnd", alreadyFrnd);

    if (alreadyFrnd) {
      return res.status(400).json({
        success: false,
        message: "You are already friend with the user",
      });
    }

    const response = await Friend.findOneAndUpdate(
      {
        $or: [
          { requester, recipient, status: "pending" },
          { requester: recipient, recipient: requester, status: "pending" },
        ],
      },
      { status: "accepted" },
      { new: true },
    );

    const receiver = await Player.findById(recipient);
    const sender = await Player.findById(requester);

    console.log("receiver sender", receiver, sender);

    if (sender?.fcmToken) {
      const payload = {
        token: sender.fcmToken,
        notification: {
          title: "Friend Request Accepted 🎉",
          body: `${receiver.username} accepted your friend request.`,
        },
        data: {
          type: "FRIEND_REQUEST_ACCEPT",
          requester,
          recipient,
        },
      };

      const notificationres = await admin.messaging().send(payload);
      console.log("Notification sent successfully", notificationres);
    } else {
      console.log("Receiver has no FCM token");
    }

    console.log("response", response);

    return res.status(201).json({
      success: true,
      message: "friend request accepted",
    });
  } catch (error) {
    console.log("error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.rejectFrndRequest = async (req, res) => {
  try {
    const { requester, recipient } = req.body;

    // check if user is already a dost friend

    const alreadyFrnd = await Friend.findOne({
      $or: [
        { requester, recipient, status: "accepted" },
        { requester: recipient, recipient: requester, status: "accepted" },
      ],
    });

    console.log("alrdyfrnd", alreadyFrnd);

    if (alreadyFrnd) {
      return res.status(400).json({
        success: false,
        message: "You are already friend with the user",
      });
    }

    const response = await Friend.findOneAndUpdate(
      {
        $or: [
          { requester, recipient, status: "pending" },
          { requester: recipient, recipient: requester, status: "pending" },
        ],
      },
      { status: "rejected" },
      { new: true },
    );

    const receiver = await Player.findById(recipient);
    const sender = await Player.findById(requester);

    console.log("receiver sender", receiver, sender);

    if (sender?.fcmToken) {
      const payload = {
        token: sender.fcmToken,
        notification: {
          title: "Friend Request rejected 😞",
          body: `${receiver.username} rejected your friend request.`,
        },
        data: {
          type: "FRIEND_REQUEST_REJECT",
          requester,
          recipient,
        },
      };

      const notificationres = await admin.messaging().send(payload);
      console.log("Notification sent successfully", notificationres);
    } else {
      console.log("Receiver has no FCM token");
    }

    console.log("response", response);
    return res.status(201).json({
      success: true,
      message: "friend request rejected",
    });
  } catch (error) {
    console.log("error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.searchUser = async (req, res) => {
  const { _id } = req.user;
  const { searchText } = req.body;

  try {
    // 1️⃣ Build base query (same as userList)
    const query = {
      _id: { $ne: _id }, // exclude self
    };

    // 2️⃣ Apply search filter
    if (searchText && searchText.trim() !== "") {
      query.username = { $regex: searchText, $options: "i" };
    }

    // 3️⃣ Fetch users
    const users = await Player.find(query).select(
      "username email firstName lastName gender country profileImage pr",
    );

    // 4️⃣ Fetch friendships
    const friendships = await Friend.find({
      $or: [{ requester: _id }, { recipient: _id }],
    });

    // 5️⃣ Build friendship map
    const friendshipMap = {};
    friendships.forEach((f) => {
      const otherUserId =
        f.requester.toString() === _id.toString()
          ? f.recipient.toString()
          : f.requester.toString();

      friendshipMap[otherUserId] = f.status;
    });

    // 6️⃣ Format users (SAME AS userList)
    const userList = users.map((user) => {
      const u = user.toObject();

      const prArray = Object.entries(u.pr || {}).map(([mode, levels]) => ({
        mode,
        ...levels,
      }));

      return {
        _id: u._id,
        username: u.username,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        gender: u.gender,
        country: u.country,
        profileImage: u.profileImage,
        pr: prArray,
        friendshipStatus: friendshipMap[u._id.toString()] || "none",
      };
    });

    return res.status(200).json({
      success: true,
      users: userList,
    });
  } catch (error) {
    console.error("Error searching users:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.userList = async (req, res) => {
  const { _id } = req.user;

  try {
    // Exclude current user
    const query = { _id: { $ne: _id } };

    const users = await Player.find(query).select(
      "username email firstName lastName  gender country profileImage pr",
    );

    // Get friendships
    const friendships = await Friend.find({
      $or: [{ requester: _id }, { recipient: _id }],
    });

    // Friendship map
    const friendshipMap = {};
    friendships.forEach((f) => {
      const otherUserId =
        f.requester.toString() === _id.toString()
          ? f.recipient.toString()
          : f.requester.toString();

      friendshipMap[otherUserId] = f.status;
    });

    // Build response
    const userList = users.map((user) => {
      const u = user.toObject();

      // Convert PR object → array
      const prArray = Object.entries(u.pr || {}).map(([mode, levels]) => ({
        mode,
        ...levels,
      }));

      return {
        _id: u._id,
        username: u.username,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        gender: u.gender,
        country: u.country,
        profileImage: u.profileImage,
        pr: prArray,
        friendshipStatus: friendshipMap[u._id.toString()] || "none",
      };
    });

    return res.status(200).json({
      success: true,
      users: userList,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.friendRequestList = async (req, res) => {
  const { _id } = req.user; // logged-in user (recipient)

  try {
    const requests = await Friend.find({
      recipient: _id,
      status: "pending",
    })
      .populate({
        path: "requester",
        select:
          "username email firstName lastName  gender country profileImage",
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      total: requests.length,
      requests,
    });
  } catch (error) {
    console.error("Error fetching friend requests:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deleteFriendship = async (req, res) => {
  const { _id } = req.user; // logged-in user
  const { friendshipId } = req.params; // friendship _id from route params

  try {
    //: Find the friendship by ID
    const friendship = await Friend.findById(friendshipId);

    if (!friendship) {
      return res.status(404).json({
        success: false,
        message: "Friendship not found",
      });
    }

    //  Ensure the logged-in user is part of the friendship - in future
    // if (
    //   friendship.requester.toString() !== _id.toString() &&
    //   friendship.recipient.toString() !== _id.toString()
    // ) {
    //   return res.status(403).json({
    //     success: false,
    //     message: "You are not authorized to delete this friendship",
    //   });
    // }

    // Step 3: Delete the record
    await friendship.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Friendship deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting friendship:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.deleteAllFriendship = async (req, res) => {
  try {
    await Friend.deleteMany({});

    return res.status(200).json({
      success: true,
      message: "Friendship deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting friendship:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.myFriendList = async (req, res) => {
  const { _id } = req.user;
  const targetLanguage = req.query.targetLanguage || "English";

  try {
    // 1️⃣ Fetch all accepted friendships
    const friendships = await Friend.find({
      status: "accepted",
      $or: [{ requester: _id }, { recipient: _id }],
    })
      .populate({
        path: "requester",
        select:
          "username email firstName lastName gender country profileImage pr",
      })
      .populate({
        path: "recipient",
        select:
          "username email firstName lastName gender country profileImage pr",
      })
      .sort({ updatedAt: -1 });

    // 2️⃣ Map friends data
    const friends = friendships.map((f) => {
      const friend =
        f.requester._id.toString() === _id.toString()
          ? f.recipient
          : f.requester;

      const prArray = Object.entries(friend.pr || {}).map(([mode, levels]) => ({
        mode,
        ...levels,
      }));

      return {
        _id: friend._id,
        username: friend.username,
        email: friend.email,
        firstName: friend.firstName,
        lastName: friend.lastName,
        gender: friend.gender,
        country: friend.country,
        profileImage: friend.profileImage,
        pr: prArray,
        friendshipStatus: "accepted",
      };
    });

    // 3️⃣ Skip translation if English
    if (targetLanguage.toLowerCase() === "english") {
      return res.status(200).json({
        success: true,
        total: friends.length,
        friends,
      });
    }

    // 4️⃣ Prepare page content for translation
    const pageContent = {
      usernames: friends.map((f) => f.username),
      countries: friends.map((f) => f.country),
    };

    // 5️⃣ Call helper function for translation
    const translated = await translatePageContent(pageContent, targetLanguage);

    // 6️⃣ Merge translated values
    const translatedFriends = friends.map((f, i) => ({
      ...f,
      username: translated.usernames?.[i] || f.username,
      country: translated.countries?.[i] || f.country,
    }));

    return res.status(200).json({
      success: true,
      total: translatedFriends.length,
      friends: translatedFriends,
    });
  } catch (error) {
    console.error("Error fetching friend list:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// exports.myFriendList = async (req, res) => {
//   const { _id } = req.user; // logged-in user

//   try {
//     // 1️⃣ Find accepted friendships
//     const friendships = await Friend.find({
//       status: "accepted",
//       $or: [{ requester: _id }, { recipient: _id }],
//     })
//       .populate({
//         path: "requester",
//         select:
//           "username email firstName lastName gender country profileImage pr",
//       })
//       .populate({
//         path: "recipient",
//         select:
//           "username email firstName lastName gender country profileImage pr",
//       })
//       .sort({ updatedAt: -1 });

//     // 2️⃣ Extract ONLY friend data (not logged-in user)
//     const friends = friendships.map((f) => {
//       const friend =
//         f.requester._id.toString() === _id.toString()
//           ? f.recipient
//           : f.requester;

//       // Convert PR object → array
//       const prArray = Object.entries(friend.pr || {}).map(([mode, levels]) => ({
//         mode,
//         ...levels,
//       }));

//       return {
//         _id: friend._id,
//         username: friend.username,
//         email: friend.email,
//         firstName: friend.firstName,
//         lastName: friend.lastName,
//         gender: friend.gender,
//         country: friend.country,
//         profileImage: friend.profileImage,
//         pr: prArray,
//         friendshipStatus: "accepted",
//       };
//     });

//     return res.status(200).json({
//       success: true,
//       total: friends.length,
//       friends,
//     });
//   } catch (error) {
//     console.error("Error fetching friend list:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Server error",
//     });
//   }
// };

exports.deleteFriendshipByUser = async (req, res) => {
  const { _id } = req.user; // logged-in user
  const { friendId } = req.body; // other user's id

  if (!friendId) {
    return res.status(400).json({
      success: false,
      message: "friendId is required",
    });
  }

  try {
    // Find friendship (accepted OR pending) involving logged-in user
    const friendship = await Friend.findOne({
      status: { $in: ["accepted", "pending"] },
      $or: [
        { requester: _id, recipient: friendId },
        { requester: friendId, recipient: _id },
      ],
    });

    if (!friendship) {
      return res.status(404).json({
        success: false,
        message: "Friendship or request not found",
      });
    }

    // Delete friendship / request
    await friendship.deleteOne();

    return res.status(200).json({
      success: true,
      message:
        friendship.status === "accepted"
          ? "Friend removed successfully"
          : "Friend request cancelled successfully",
    });
  } catch (error) {
    console.error("Error deleting friendship:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Helper function to translate content
async function translatePageContent(pageContent, targetLanguage) {
  try {
    const response = await axios.post(
      "http://localhost:3000/api/auth/translate",
      {
        pageContent,
        targetLanguage,
      },
    );
    return response.data.translatedContent;
  } catch (err) {
    console.error("Translation API error:", err);
    return pageContent; // fallback: return original if translation fails
  }
}

// ---------------- Top 100 Friends ----------------
exports.top100FriendList = async (req, res) => {
  try {
    const userId = req.user.id;
    const targetLanguage = req.query.targetLanguage || "English";

    // 1️⃣ Get logged-in player
    const player = await Player.findById(userId);
    if (!player)
      return res
        .status(404)
        .json({ success: false, message: "Player not found" });

    // 2️⃣ Determine strongest level
    const { easy, medium, hard } = player.pr.pvp;
    let level =
      easy >= medium && easy >= hard
        ? "easy"
        : medium >= easy && medium >= hard
          ? "medium"
          : "hard";

    // 3️⃣ Get accepted friends
    const friendships = await Friend.find({
      status: "accepted",
      $or: [{ requester: userId }, { recipient: userId }],
    }).select("requester recipient");

    const friendIds = friendships.map((f) =>
      f.requester.toString() === userId ? f.recipient : f.requester,
    );

    // 4️⃣ Get top 100 friends based on level
    let topFriends = await Player.find({
      _id: { $in: friendIds },
      "accountStatus.state": "active",
    })
      .sort({ [`pr.pvp.${level}`]: -1 })
      .limit(100)
      .select("username country profileImage pr")
      .lean();

    // 5️⃣ Translate if not English
    if (targetLanguage.toLowerCase() !== "english") {
      const pageContent = {
        usernames: topFriends.map((f) => f.username),
        countries: topFriends.map((f) => f.country),
      };
      const translated = await translatePageContent(
        pageContent,
        targetLanguage,
      );
      topFriends = topFriends.map((f, i) => ({
        ...f,
        username: translated.usernames?.[i] || f.username,
        country: translated.countries?.[i] || f.country,
      }));
    }

    res.status(200).json({
      success: true,
      msg: `Top 100 friends based on your strongest level: ${level}`,
      playerLevel: level,
      count: topFriends.length,
      data: topFriends,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ---------------- Top 10 Country ----------------
exports.top10CountryList = async (req, res) => {
  try {
    const userId = req.user.id;
    const targetLanguage = req.query.targetLanguage || "English";

    const player = await Player.findById(userId);
    if (!player)
      return res
        .status(404)
        .json({ success: false, message: "Player not found" });

    const { easy, medium, hard } = player.pr.pvp;
    let level =
      easy >= medium && easy >= hard
        ? "easy"
        : medium >= easy && medium >= hard
          ? "medium"
          : "hard";

    const country = player.country;

    let players = await Player.find({
      country,
      "accountStatus.state": "active",
    })
      .sort({ [`pr.pvp.${level}`]: -1 })
      .limit(10)
      .select("username profileImage country pr")
      .lean();

    if (targetLanguage.toLowerCase() !== "english") {
      const pageContent = {
        usernames: players.map((p) => p.username),
        countries: players.map((p) => p.country),
      };
      const translated = await translatePageContent(
        pageContent,
        targetLanguage,
      );
      players = players.map((p, i) => ({
        ...p,
        username: translated.usernames?.[i] || p.username,
        country: translated.countries?.[i] || p.country,
      }));
    }

    res.status(200).json({
      success: true,
      msg: `Top 10 players in your country (${country}) for your level: ${level}`,
      playerLevel: level,
      count: players.length,
      data: players,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ---------------- Top 10 Global ----------------
exports.top10GlobalList = async (req, res) => {
  try {
    const userId = req.user.id;
    const targetLanguage = req.query.targetLanguage || "English";

    const player = await Player.findById(userId);
    if (!player)
      return res
        .status(404)
        .json({ success: false, message: "Player not found" });

    const { easy, medium, hard } = player.pr.pvp;
    let level =
      easy >= medium && easy >= hard
        ? "easy"
        : medium >= easy && medium >= hard
          ? "medium"
          : "hard";

    let players = await Player.find({ "accountStatus.state": "active" })
      .sort({ [`pr.pvp.${level}`]: -1 })
      .limit(10)
      .select("username country profileImage pr")
      .lean();

    if (targetLanguage.toLowerCase() !== "english") {
      const pageContent = {
        usernames: players.map((p) => p.username),
        countries: players.map((p) => p.country),
      };
      const translated = await translatePageContent(
        pageContent,
        targetLanguage,
      );
      players = players.map((p, i) => ({
        ...p,
        username: translated.usernames?.[i] || p.username,
        country: translated.countries?.[i] || p.country,
      }));
    }

    res.status(200).json({
      success: true,
      msg: `Top 10 players globally for your level: ${level}`,
      playerLevel: level,
      count: players.length,
      data: players,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
