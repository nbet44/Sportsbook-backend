const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const bet356PrematchModel = () => {
    var modelSchema = new Schema({
        FI: { type: String, required: true },
        EventId: { type: String, required: true },
        OurId: { type: String, required: true },
        SportId: { type: Number },
        SportName: { type: String },
        HomeTeam: { type: String },
        AwayTeam: { type: String },
        IsPreMatch: { type: Boolean },
        asian_lines: { type: Object },
        goals: { type: Object },
        half: { type: Object },
        main: { type: Object },
        schedule: { type: Object },
        updated_at: { type: Number }
    });
    return mongoose.model("tbl_bet365_preEvent", modelSchema)
}

const bwinInPlayModel = () => {
    var modelSchema = new Schema({
        Id: { type: String, required: true },
        SportId: { type: Number },
        SportName: { type: String },
        RegionId: { type: Number },
        RegionName: { type: String },
        LeagueId: { type: Number },
        LeagueName: { type: String },
        HomeTeam: { type: String },
        AwayTeam: { type: String },
        BetRadarId: { type: Number },
        IsPreMatch: { type: Boolean },
        Date: { type: Date },
        Scoreboard: { type: Object },
        type: { type: String },
        clickCount: { type: Number, default: 1 },
        playCount: { type: Number, default: 1 },
        updated_at: { type: Number }
    });
    return mongoose.model("tbl_bwin_inplay", modelSchema)
}

const bwinEventModel = () => {
    var modelSchema = new Schema({
        AwayTeam: { type: String },
        AwayTeamId: { type: String },
        AwayTeamShort: { type: String },
        BetRadarId: { type: String },
        HomeTeam: { type: String },
        HomeTeamId: { type: String },
        HomeTeamShort: { type: String },
        Id: { type: String },
        IsPreMatch: { type: Boolean },
        LeagueId: { type: String },
        LeagueName: { type: String },
        Markets: { type: Object },
        RegionId: { type: String },
        RegionName: { type: String },
        Scoreboard: { type: Object },
        SportId: { type: String },
        SportName: { type: String },
        optionMarkets: { type: Object },
        our_event_id: { type: String },
        updated_at: { type: String },
        Date: { type: Date },
        favor: { type: Boolean },
        created: { type: Date, default: Date.now }
    });
    return mongoose.model("tbl_bwin_event", modelSchema)
}

module.exports = {
    bet356PrematchModel: bet356PrematchModel(),
};