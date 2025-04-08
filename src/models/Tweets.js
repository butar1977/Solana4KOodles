const mongoose = require("mongoose");

const TweetSchema = new mongoose.Schema(
    {
        tweetId: { type: String, required: true },
        text: { type: String, required: true },
        created_at: { type: Date, required: true },
        username: { type: String, required: true },
        public_metrics: {
            retweet_count: { type: Number, default: 0 },
            reply_count: { type: Number, default: 0 },
            like_count: { type: Number, default: 0 },
            quote_count: { type: Number, default: 0 },
            bookmark_count: { type: Number, default: 0 },
            impression_count: { type: Number, default: 0 },
        },
        name: { type: String, required: true },
        verified: { type: Boolean, required: true },
        xUserId: { type: String, required: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Tweet", TweetSchema);
