// controller/BadgeSocket.js
/**
 * Badge Socket Handler
 * ─────────────────────────────────────────────────────────────────────────────
 * Manages real-time badge delivery to players via Socket.IO
 *
 * Features:
 *  • Real-time badge earned notifications
 *  • Offline badge storage & delivery on reconnect
 *  • Only player who earned badge gets notified
 *  • Separate from PvP socket for isolation
 * ─────────────────────────────────────────────────────────────────────────────
 */

const PlayerBadge = require("../models/PlayerBadge");

module.exports = function registerBadgeSocket(io) {
  // ✅ Track userId -> socketId for badge delivery
  // Survives brief disconnects (10s) to handle reconnects
  const userIdToSocketId = new Map();

  io.on("connection", async (socket) => {
    console.log(`🎫 Badge socket connected: ${socket.id}`);

    /**
     * REGISTER PLAYER FOR BADGE DELIVERY
     * Client must emit this with their userId after authentication
     */
    socket.on("register-badge-socket", async (data) => {
      try {
        const { userId } = data;

        if (!userId) {
          socket.emit("badge-socket-error", {
            message: "userId is required",
          });
          return;
        }

        // Check if this user already has a session under a different socket
        const oldSocketId = userIdToSocketId.get(userId);
        if (oldSocketId && oldSocketId !== socket.id) {
          console.log(
            `🔄 User ${userId} badge socket reconnected: ${oldSocketId} → ${socket.id}`,
          );
          // Leave old socket room
          io.sockets.sockets.get(oldSocketId)?.leave(`badge:${userId}`);
        }

        // Update tracking & join user-specific room
        userIdToSocketId.set(userId, socket.id);
        socket.join(`badge:${userId}`);

        console.log(
          `✅ User ${userId} registered for badge delivery (socket: ${socket.id})`,
        );

        // ── Deliver any offline badges ──
        const offlineBadges = await PlayerBadge.find({
          player: userId,
          notified: false,
          isEarned: true,
        })
          .populate("badge", "badgeId title description category iconUrl")
          .lean();

        if (offlineBadges.length > 0) {
          console.log(
            `📬 Delivering ${offlineBadges.length} offline badges to ${userId}`,
          );

          const badges = offlineBadges.map((pb) => ({
            badgeId: pb.badge.badgeId,
            title: pb.badge.title,
            description: pb.badge.description,
            category: pb.badge.category,
            iconUrl: pb.badge.iconUrl || null,
            earnedAt: pb.earnedAt,
          }));

          socket.emit("badges:offline", { badges });

          // Mark as notified
          await PlayerBadge.updateMany(
            { _id: { $in: offlineBadges.map((b) => b._id) } },
            { notified: true },
          );
        }

        socket.emit("badge-socket-registered", {
          success: true,
          message: "Badge socket registered",
          offlineBadgesCount: offlineBadges.length,
        });
      } catch (err) {
        console.error("❌ register-badge-socket error:", err);
        socket.emit("badge-socket-error", { message: err.message });
      }
    });

    /**
     * DISCONNECT HANDLER
     * Keep userId mapping alive for 10s to handle quick reconnects
     */
    socket.on("disconnect", () => {
      console.log(`👋 Badge socket disconnected: ${socket.id}`);

      // Find which user this socket belongs to
      let disconnectedUserId = null;
      for (const [userId, socketId] of userIdToSocketId.entries()) {
        if (socketId === socket.id) {
          disconnectedUserId = userId;
          break;
        }
      }

      if (disconnectedUserId) {
        // Wait 10s before removing mapping (allows for quick reconnects)
        setTimeout(() => {
          if (userIdToSocketId.get(disconnectedUserId) === socket.id) {
            userIdToSocketId.delete(disconnectedUserId);
            console.log(
              `🗑️ Cleared badge socket mapping for user ${disconnectedUserId}`,
            );
          }
        }, 10000);
      }
    });
  });

  // ─────────────────────────────────────────────
  // EXPOSED METHODS FOR BADGE SERVICE
  // ─────────────────────────────────────────────

  /**
   * Emit badge earned event to a player
   * Called by BadgeService when a badge is earned
   *
   * @param {string} playerId - MongoDB ObjectId
   * @param {object} badgeInfo - { badgeId, title, description, category, iconUrl, earnedAt }
   */
  function emitBadgeEarned(playerId, badgeInfo) {
    const socketId = userIdToSocketId.get(playerId);

    if (socketId) {
      // Player is online — send real-time
      console.log(
        `🏅 Emitting badge to online player ${playerId}: ${badgeInfo.title}`,
      );
      io.to(socketId).emit("badge:earned", badgeInfo);
    } else {
      // Player is offline — will be delivered on reconnect
      console.log(
        `💾 Player ${playerId} offline. Badge will be delivered on reconnect: ${badgeInfo.title}`,
      );
    }
  }

  /**
   * Get socket ID for a player (for debugging/testing)
   */
  function getPlayerSocketId(playerId) {
    return userIdToSocketId.get(playerId);
  }

  /**
   * Get all connected players (for debugging/testing)
   */
  function getConnectedPlayers() {
    return Array.from(userIdToSocketId.entries()).map(([userId, socketId]) => ({
      userId,
      socketId,
    }));
  }

  return {
    emitBadgeEarned,
    getPlayerSocketId,
    getConnectedPlayers,
  };
};
