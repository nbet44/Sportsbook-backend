const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const lxbetPrematchModel = () => {
    var modelSchema = new Schema({
        Id: { type: String, required: true },
        OurId: { type: String, required: true },
        SportId: { type: Number },
        SportName: { type: String },
        HomeTeam: { type: String },
        AwayTeam: { type: String },
        IsPreMatch: { type: Boolean },
        Value: { type: Object },
        updated_at: { type: Number }
    });
    return mongoose.model("tbl_1xbet_preEvent", modelSchema)
}

module.exports = {
    lxbetPrematchModel: lxbetPrematchModel(),
};