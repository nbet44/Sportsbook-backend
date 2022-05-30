const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userModel = () => {
    var modelSchema = new Schema({
        userId: { type: String, unique: true },
        username: { type: String },
        name: { type: String },
        password: { type: String },
        firstname: { type: String },
        lastname: { type: String },
        currency: { type: String, default: "TRY" },
        balance: { type: Number, default: 0 },
        token: { type: String },
        access_token: { type: String },
        sessionId: { type: String },
        status: { type: String },
        isOnline: { type: String, default: 'OFF' },
        permission: { type: Object },
        role: { type: String, default: "user" },
        pid: { type: String },
        agentShare: { type: Number, default: 85 },
        agentCommission: { type: Number, default: 0 },
        platformCommission: { type: Number, default: 0 },
        sportsCommission: { type: Number, default: 0 },
        casinoCommission: { type: Number, default: 0 },
        agentId: { type: String },
        level: { type: String, default: "normal" },
        maxBetLimit: { type: Number, default: 400 },
        weeklyCreditResetState: { type: Object },
        weeklyCreditResetDay: { type: Object },
        weeklyCreditProceed: { type: Boolean },
        credit: { type: String },
        withdrawalCredit: { type: Number },
        extraCredit: { type: Number },
        autoWeeklyCredit: { type: Number },
        language: { type: String, default: "English" },
        prematchSpread: { type: Object, default: { value: 16, label: 16 } },
        liveSpread: { type: Object, default: { value: 24, label: 24 } },
        mixSpread: { type: Object, default: { value: 38, label: 38 } },
        ratio: { type: Number, default: 0 },
        ratioLive: { type: Number, default: 0 },
        ratioSpacial: { type: Number, default: 0 },
        sportsDiscount: { type: Number, default: 0 },
        casinoDiscount: { type: Number, default: 0 },
        setting: {
            showRule: { type: Boolean, default: true },
            unlimitedMix: { type: Boolean, default: false },
            reschedule: { type: Boolean, default: true },
            blockLive: { type: Boolean, default: false },
            multiSession: { type: Boolean, default: false },
            dangerous: { type: Boolean, default: false },
            cashout: { type: Boolean, default: true },
            loginNotify: { type: Boolean, default: false },
            betNotify: { type: Object, default: { value: 1000, label: 1000 } },
            maxBetPerGame: { type: Object, default: { value: 5, label: 5 } },
            betLimitMin: { type: Object, default: { value: 1, label: 1 } },
        },
        created: { type: Date, default: Date.now },
        updated: { type: Date }
    });
    return mongoose.model("tbl_user", modelSchema)
}

module.exports = {
    userModel: userModel()
};