// mongose is needed here for the definition
var mongoose = require('mongoose');
var Schema = mongoose.Schema;


module.exports = {
    bet777: {
    },

    betsapi: {
        tbl_bet365_preevent: new Schema({
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
        }),

        tbl_sbobet_preevent: new Schema({
            Id: { type: String, required: true },
            OurId: { type: String, required: true },
            SportId: { type: Number },
            SportName: { type: String },
            HomeTeam: { type: String },
            AwayTeam: { type: String },
            IsPreMatch: { type: Boolean },
            markets: { type: Array },
            updated_at: { type: Number }
        }),

        tbl_1xbet_preevent: new Schema({
            Id: { type: String, required: true },
            OurId: { type: String, required: true },
            SportId: { type: Number },
            SportName: { type: String },
            HomeTeam: { type: String },
            AwayTeam: { type: String },
            IsPreMatch: { type: Boolean },
            Value: { type: Object },
            updated_at: { type: Number }
        })
    }
};