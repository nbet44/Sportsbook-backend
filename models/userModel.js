const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userModel = () => {
    var modelSchema = new Schema({
        userId: { type: String, unique: true },
        username: { type: String },
        password: { type: String },
        firstname: { type: String },
        lastname: { type: String },
        currency: { type: String, default: "TRY" },
        balance: { type: Number, default: 0 },
        token: { type: String },
        access_token: { type: String },
        sessionId: { type: String },
        status: { type: String },
        isOnline: { type: Boolean },
        permission: { type: Object },
        role: { type: String, default: "user" },
        pid: { type: String },
        agentShare: { type: Number, default: 85 },
        agentCommission: { type: Number, default: 0 },
        platformCommission: { type: Number, default: 0 },
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
        prematchSpread: { type: Object },
        liveSpread: { type: Object },
        mixSpread: { type: Object },
        ratio: { type: Object },
        setting: { type: Object },
        created: { type: Date, default: Date.now },
        updated: { type: Date }
    });
    return mongoose.model("tbl_user", modelSchema)
}

module.exports = {
    userModel: userModel()
};