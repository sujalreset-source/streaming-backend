import ArtistApplication from "../models/artist-application.model.js";

export const artistApplicationRepository = {
  /**
   * Find application by ID (admin/internal use)
   */
  async findById(id) {
    return ArtistApplication.findById(id).lean();
  },

   // -----------------------------
  // 2️⃣ DOCUMENT — for model methods (approve, reject, update)
  // -----------------------------
  async findByIdDoc(id) {
    return ArtistApplication.findById(id);  // NO LEAN
  },

  /**
   * Find application by user ID
   */
  async findByUserId(userId) {
    return ArtistApplication.findOne({ userId }).lean();
  },


  async updateById (id, payload){
  return ArtistApplication.findByIdAndUpdate(id, payload, { new: true });
},
  /**
   * Create a new application
   */
  async createApplication(payload) {
    return ArtistApplication.create(payload);
  },

  /**
   * Update application by ID
   */
  async updateById(id, payload) {
    return ArtistApplication.findByIdAndUpdate(
      id,
      { $set: payload },
      { new: true }
    ).lean();
  },

  /**
   * Find applications for admin listing
   * Supports pagination, search, filtering
   */
  async findForAdmin({ status, search, limit, skip }) {
    const query = {};
    
    if (status) {
      query.status = status;
    }

    if (search) {
      query.stageName = { $regex: search, $options: "i" };
    }

    return ArtistApplication.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  },

  /**
   * Count applications for admin list (for pagination)
   */
  async countForAdmin({ status, search }) {
    const query = {};

    if (status) {
      query.status = status;
    }

    if (search) {
      query.stageName = { $regex: search, $options: "i" };
    }

    return ArtistApplication.countDocuments(query);
  },

  /**
   * Reapply after rejection:
   * Update fields & increment attemptCount
   */
  async reapply(id, payload) {
    return ArtistApplication.findByIdAndUpdate(
      id,
      {
        $set: {
          ...payload,
          status: "pending",
          adminNotes: null,
          adminReviewer: null,
          reviewedAt: null,
        },
        $inc: {
          attemptCount: 1,
        }
      },
      { new: true }
    );
  },

  /**
   * Update application status (approve, reject, needs_info)
   */
  async updateStatus(id, payload) {
    return ArtistApplication.findByIdAndUpdate(
      id,
      { $set: payload },
      { new: true }
    ).lean();
  },
};

/**
 * Ensure artist:
 * - exists
 * - belongs to the requesting user
 * - has been approved (status === "approved")
 *
 * NOTE:
 * Ownership check assumes artist.owner === userId. Adjust if your schema differs.
 */
export async function findArtistForMonetization({ artistId, userId }) {
  return Artist.findOne({
    _id: artistId,
    owner: userId,
    approvalStatus: "approved"
  })
    .select("_id owner approvalStatus monetizationStatus subscriptionPlans")
    .lean();
}

/**
 * Mark artist monetization setup as "setting_up".
 *
 * Called BEFORE queue job runs.
 */
export async function markSettingUp(artistId) {
  return Artist.findByIdAndUpdate(
    artistId,
    {
      $set: {
        monetizationStatus: "setting_up",
        monetizationSetupAt: new Date()
      }
    },
    { new: true }
  );
}

/**
 * Save final subscription plans inside Artist document.
 * Used by worker after successful gateway plan creation.
 *
 * This MUST run inside a transaction (session) so that:
 * - status update
 * - plan insertion
 * - audit update
 * happen atomically.
 */
export async function saveSubscriptionPlans({ artistId, plans, session }) {
  const now = new Date();

  return Artist.findByIdAndUpdate(
    artistId,
    {
      $set: {
        monetizationStatus: "active",
        isMonetizationComplete: true,
        monetizationLastSyncAt: now
      },
      $push: {
        subscriptionPlans: { $each: plans }
      }
    },
    { new: true, session }
  ).lean();
}

/**
 * Helper for partially updating artist in case of partial failures.
 * Example: only Stripe succeeded, Razorpay failed.
 */
export async function savePartialPlans({
  artistId,
  partialPlans,
  session
}) {
  return Artist.findByIdAndUpdate(
    artistId,
    {
      $push: {
        subscriptionPlans: { $each: partialPlans }
      }
    },
    { new: true, session }
  ).lean();
}
