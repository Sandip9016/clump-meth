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
    // 1️⃣ Build base query (exclude self)
    const query = {
      _id: { $ne: _id },
    };

    // 2️⃣ Apply search filter for username, name, or email
    if (searchText && searchText.trim() !== "") {
      const regex = new RegExp(searchText, "i"); // case-insensitive regex
      query.$or = [
        { username: { $regex: regex } },
        { email: { $regex: regex } },
        { firstName: { $regex: regex } },
        { lastName: { $regex: regex } },
      ];
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

    // 6️⃣ Format users
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

// ---------------- Translation Helper ----------------
// ✅ Google GTX (Best for names)
async function translateWithGoogle(text, targetLanguage) {
  const response = await axios.get(
    "https://translate.googleapis.com/translate_a/single",
    {
      params: { client: "gtx", sl: "en", tl: targetLanguage, dt: "t", q: text },
      timeout: 6000,
    },
  );
  const result = response.data[0].map((chunk) => chunk[0]).join("");
  if (!result) throw new Error("Google GTX returned empty");
  return result;
}

// ✅ MyMemory fallback
async function translateWithMyMemory(text, targetLanguage) {
  const response = await axios.get("https://api.mymemory.translated.net/get", {
    params: { q: text, langpair: `en|${targetLanguage}` },
    timeout: 6000,
  });
  const result = response.data.responseData.translatedText;
  if (!result) throw new Error("MyMemory returned empty");
  return result;
}

// ✅ Lingva fallback
async function translateWithLingva(text, targetLanguage) {
  const response = await axios.get(
    `https://lingva.lunar.icu/api/v1/en/${targetLanguage}/${encodeURIComponent(
      text,
    )}`,
    { timeout: 6000 },
  );
  const result = response.data.translation;
  if (!result) throw new Error("Lingva returned empty");
  return result;
}

// Main translation function
async function translateText(text, targetLanguage) {
  if (!text || typeof text !== "string") return text;
  if (targetLanguage.toLowerCase() === "en") return text;

  const apis = [
    { name: "Google", fn: () => translateWithGoogle(text, targetLanguage) },
    { name: "MyMemory", fn: () => translateWithMyMemory(text, targetLanguage) },
    { name: "Lingva", fn: () => translateWithLingva(text, targetLanguage) },
  ];

  for (const api of apis) {
    try {
      const result = await api.fn();
      return result;
    } catch (err) {
      console.warn(`[${api.name}] failed: ${err.message}`);
    }
  }

  return text; // fallback
}

// Translate list of users
async function translateUsers(users, targetLanguage) {
  return Promise.all(
    users.map(async (user) => {
      const [username, country] = await Promise.all([
        translateText(user.username, targetLanguage),
        translateText(user.country, targetLanguage),
      ]);
      return { ...user, username, country };
    }),
  );
}
//------------------ End of Translation Helper ----------------

// ---------------- My Friend List ----------------
exports.myFriendList = async (req, res) => {
  const { _id } = req.user;
  try {
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

    let friends = friendships
      .filter((f) => f.requester && f.recipient)
      .map((f) => {
        const friend =
          f.requester?._id?.toString() === _id.toString()
            ? f.recipient
            : f.requester;

        const prArray = Object.entries(friend.pr || {}).map(
          ([mode, levels]) => ({
            mode,
            ...levels,
          }),
        );

        return {
          _id: friend?._id,
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

    // ✅ Translate username & country
    friends = await translateUsers(
      friends,
      req.query.targetLanguage || "English",
    );

    return res.status(200).json({
      success: true,
      total: friends.length,
      friends,
    });
  } catch (error) {
    console.error("Error fetching friend list:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ---------------- Top 100 Friends ----------------
exports.top100FriendList = async (req, res) => {
  try {
    const userId = req.user.id;
    const targetLanguage = req.query.targetLanguage || "English";

    // 1. Get current player
    const player = await Player.findById(userId).lean();
    if (!player) {
      return res.status(404).json({
        success: false,
        message: "Player not found",
      });
    }

    // 2. Determine strongest level
    const { easy = 0, medium = 0, hard = 0 } = player.pr.pvp;
    const level =
      easy >= medium && easy >= hard
        ? "easy"
        : medium >= easy && medium >= hard
          ? "medium"
          : "hard";

    const userScore = player.pr.pvp[level];

    // 3. Get accepted friends
    const friendships = await Friend.find({
      status: "accepted",
      $or: [{ requester: userId }, { recipient: userId }],
    }).select("requester recipient");

    // 4. Extract unique friend IDs and include self
    const friendIds = [
      ...new Set(
        friendships.map((f) =>
          f.requester.toString() === userId
            ? f.recipient.toString()
            : f.requester.toString(),
        ),
      ),
    ];
    friendIds.push(userId);

    // 5. Fetch friends including self
    let friends = await Player.find({
      _id: { $in: friendIds },
      "accountStatus.state": "active",
    })
      .sort({ [`pr.pvp.${level}`]: -1 })
      .limit(100)
      .select("username country profileImage pr")
      .lean();

    // 6. Map friends to include score and rank
    friends = friends.map((p, i) => ({
      username: p.username,
      country: p.country,
      profileImage: p.profileImage,
      score: p.pr?.pvp?.[level] || 0,
      rank: i + 1,
    }));

    // 7. Ensure current user is included
    let currentUser = friends.find((p) => p.username === player.username);
    if (!currentUser) {
      currentUser = {
        username: player.username,
        country: player.country,
        profileImage: player.profileImage,
        score: userScore,
        rank: friends.length + 1,
      };
      friends.push(currentUser);
    }

    // 8. Translate usernames & countries
    friends = await translateUsers(friends, targetLanguage);
    currentUser = friends.find((p) => p.username === player.username);

    // 9. Send response
    res.status(200).json({
      success: true,
      message: `Top 100 friends based on your strongest level: ${level}`,
      playerLevel: level,
      count: friends.length,
      currentUser,
      data: friends,
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

    // 1. Get current player
    const player = await Player.findById(userId).lean();
    if (!player)
      return res
        .status(404)
        .json({ success: false, message: "Player not found" });

    // 2. Determine strongest level
    const { easy = 0, medium = 0, hard = 0 } = player.pr.pvp;
    const level =
      easy >= medium && easy >= hard
        ? "easy"
        : medium >= easy && medium >= hard
          ? "medium"
          : "hard";
    const userScore = player.pr.pvp[level];
    const country = player.country;

    // 3. Get top 10 in the country
    let players = await Player.find({
      country,
      "accountStatus.state": "active",
    })
      .sort({ [`pr.pvp.${level}`]: -1 })
      .limit(10)
      .select("username profileImage country pr")
      .lean();

    // 4. Map players to include score & rank
    players = players.map((p, i) => ({
      username: p.username,
      country: p.country,
      profileImage: p.profileImage,
      score: p.pr?.pvp?.[level] || 0,
      rank: i + 1,
    }));

    // 5. Translate usernames & countries
    players = await translateUsers(players, targetLanguage);

    // 6. Get current user's rank in country
    const higherCount = await Player.countDocuments({
      country,
      "accountStatus.state": "active",
      [`pr.pvp.${level}`]: { $gt: userScore },
    });

    const currentUser = {
      username: player.username,
      country: player.country,
      profileImage: player.profileImage,
      score: userScore,
      rank: higherCount + 1,
    };

    // 7. Send response
    res.status(200).json({
      success: true,
      msg: `Top 10 players in your country (${country}) for your level: ${level}`,
      playerLevel: level,
      currentUser,
      count: players.length,
      data: players,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ---------------- Top 10 Global player rank and below 10 players ----------------
exports.top10GlobalList = async (req, res) => {
  try {
    const userId = req.user.id;
    const targetLanguage = req.query.targetLanguage || "English";

    // 1. Get current player
    const player = await Player.findById(userId).lean();
    if (!player) {
      return res.status(404).json({
        success: false,
        message: "Player not found",
      });
    }

    // 2. Determine best level
    const { easy = 0, medium = 0, hard = 0 } = player.pr.pvp;

    let level =
      easy >= medium && easy >= hard
        ? "easy"
        : medium >= easy && medium >= hard
          ? "medium"
          : "hard";

    const userScore = player.pr.pvp[level];

    // 3. Get Top 10 players
    let top10 = await Player.find({ "accountStatus.state": "active" })
      .sort({ [`pr.pvp.${level}`]: -1 })
      .limit(10)
      .select("username country profileImage pr")
      .lean();

    // 4. Calculate user rank
    const higherCount = await Player.countDocuments({
      "accountStatus.state": "active",
      [`pr.pvp.${level}`]: { $gt: userScore },
    });

    const userRank = higherCount + 1;

    // 5. Get next 10 players BELOW user
    let belowPlayers = await Player.find({
      "accountStatus.state": "active",
      [`pr.pvp.${level}`]: { $lt: userScore },
    })
      .sort({ [`pr.pvp.${level}`]: -1 })
      .limit(10)
      .select("username country profileImage pr")
      .lean();

    // 6. Prepare current user object (same format)
    let currentUser = {
      username: player.username,
      country: player.country,
      profileImage: player.profileImage,
      score: userScore,
      rank: userRank,
    };

    // 7. Normalize top10 & belowPlayers (add score field)
    const formatPlayers = (players) =>
      players.map((p) => ({
        username: p.username,
        country: p.country,
        profileImage: p.profileImage,
        score: p.pr?.pvp?.[level] || 0,
      }));

    top10 = formatPlayers(top10);
    belowPlayers = formatPlayers(belowPlayers);

    // 8. Translate users
    top10 = await translateUsers(top10, targetLanguage);
    belowPlayers = await translateUsers(belowPlayers, targetLanguage);
    currentUser = (await translateUsers([currentUser], targetLanguage))[0];

    // 9. Final response
    res.status(200).json({
      success: true,
      message: `Leaderboard for level: ${level}`,
      playerLevel: level,
      yourRank: userRank,
      currentUser,
      top10Count: top10.length,
      belowCount: belowPlayers.length,
      top10,
      belowPlayers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
