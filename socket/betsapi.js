const { default: axios } = require("axios");
var FormData = require('form-data');
const { sbobetPrematchModel } = require("../models/sbobetModel");
const { bet356PrematchModel } = require("../models/bet365Model");
const { lxbetPrematchModel } = require("../models/lxbetModel");
const baseController = require("../controller/baseController");
const { token } = require("../config/index");

module.exports = async () => {
    //BET365 start
    const prematchOddBet365 = async (param) => {
        request = {
            method: "get",
            url: "https://api.b365api.com/v3/bet365/prematch?token=" + token + "&FI=" + param.id,
        };
        try {
            response = await axios(request);
            if (response.data.success == 1 && response.data.results.length) {
                let data = response.data.results[0]
                let sdata = {
                    FI: data.FI,
                    EventId: data.event_id,
                    OurId: param.our_event_id,
                    SportId: 1,
                    SportName: "Soccer",
                    HomeTeam: param.home.name,
                    AwayTeam: param.away.name,
                    IsPreMatch: true,
                    asian_lines: data.asian_lines,
                    goals: data.goals,
                    half: data.half,
                    main: data.main,
                    schedule: data.schedule,
                    updated_at: param.updated_at
                }
                await baseController.BfindOneAndUpdate(bet356PrematchModel, { FI: sdata.FI }, sdata)
            }
        } catch (e) {
            console.log('Getting BET365 pre-event odds', e.message)
        }
    }

    const prematchBet365 = async (page = 1) => {
        request = {
            method: "get",
            url: "https://api.b365api.com/v1/bet365/upcoming?sport_id=1&page=" + page + "&token=" + token,
        };
        try {
            response = await axios(request);
            if (response.data.success === 1) {
                let funcs = []
                for (let i in response.data.results) {
                    funcs.push(prematchOddBet365(response.data.results[i]))
                }
                Promise.all(funcs)
            }
        } catch (e) {
            console.log('Getting BET365 pre-event', e.message)
        }
    }

    const getPreBET365 = async () => {
        request = {
            method: "get",
            url: "https://api.b365api.com/v1/bet365/upcoming?sport_id=1&token=" + token,
        };
        try {
            response = await axios(request);
            if (response.data.success === 1) {
                let data = response.data
                let total = Math.ceil(data.pager.total / data.pager.per_page)
                for (let i = 1; i <= total; i++) {
                    await prematchBet365([i])
                }
            }
        } catch (e) {
            console.log('Start getting prematch BET365', e.message)
        }
    }
    //BET365 end

    //SBOBET start
    const prematchOddSbobet = async (param) => {
        request = {
            method: "get",
            url: "https://api.b365api.com/v1/sbobet/event?token=" + token + "&event_id=" + param.id,
        };
        try {
            response = await axios(request);
            if (response.data.success == 1 && response.data.results.length) {
                let data = response.data.results[0]
                let sdata = {
                    Id: data.id,
                    OurId: param.our_event_id,
                    SportId: 1,
                    SportName: "Soccer",
                    HomeTeam: param.home.name,
                    AwayTeam: param.away.name,
                    IsPreMatch: true,
                    markets: data.markets,
                    updated_at: data.updated_at
                }
                await baseController.BfindOneAndUpdate(sbobetPrematchModel, { Id: sdata.Id }, sdata)
            }
        } catch (e) {
            console.log('Getting SBOBET pre-event odds', e.message)
        }
    }

    const prematchSbobet = async (page = 1) => {
        request = {
            method: "get",
            url: "https://api.b365api.com/v1/sbobet/upcoming?sport_id=1&page=" + page + "&token=" + token,
        };
        try {
            response = await axios(request);
            if (response.data.success === 1) {
                let funcs = []
                for (let i in response.data.results) {
                    funcs.push(prematchOddSbobet(response.data.results[i]))
                }
                Promise.all(funcs)
            }
        } catch (e) {
            console.log('Getting SBOBET pre-event', e.message)
        }
    }

    const getPreSbobet = async () => {
        request = {
            method: "get",
            url: "https://api.b365api.com/v1/sbobet/upcoming?sport_id=1&token=" + token,
        };
        try {
            response = await axios(request);
            if (response.data.success === 1) {
                let data = response.data
                let total = Math.ceil(data.pager.total / data.pager.per_page)
                for (let i = 1; i <= total; i++) {
                    await prematchSbobet([i])
                }
            }
        } catch (e) {
            console.log('Start getting prematch SBOBET', e.message)
        }
    }
    //SBOBET end

    //1XBET start
    const prematchOdd1XBET = async (param) => {
        request = {
            method: "get",
            url: "https://api.b365api.com/v1/1xbet/event?token=" + token + "&event_id=" + param.id,
        };
        try {
            response = await axios(request);
            if (response.data.success == 1 && response.data.results.length) {
                let data = response.data.results[0]
                let sdata = {
                    Id: data.id,
                    OurId: param.our_event_id,
                    SportId: 1,
                    SportName: "Soccer",
                    HomeTeam: param.home.name,
                    AwayTeam: param.away.name,
                    IsPreMatch: true,
                    Value: data.Value,
                    updated_at: data.updated_at
                }
                await baseController.BfindOneAndUpdate(lxbetPrematchModel, { Id: sdata.Id }, sdata)
            }
        } catch (e) {
            console.log('Getting SBOBET pre-event odds', e.message)
        }
    }

    const prematch1XBET = async (page = 1) => {
        request = {
            method: "get",
            url: "https://api.b365api.com/v1/1xbet/upcoming?sport_id=1&page=" + page + "&token=" + token,
        };
        try {
            response = await axios(request);
            if (response.data.success === 1) {
                let funcs = []
                for (let i in response.data.results) {
                    funcs.push(prematchOdd1XBET(response.data.results[i]))
                }
                Promise.all(funcs)
            }
        } catch (e) {
            console.log('Getting 1XBET pre-event', e.message)
        }
    }

    const getPre1XBET = async () => {
        request = {
            method: "get",
            url: "https://api.b365api.com/v1/1xbet/upcoming?sport_id=1&token=" + token,
        };
        try {
            response = await axios(request);
            if (response.data.success === 1) {
                let data = response.data
                let total = Math.ceil(data.pager.total / data.pager.per_page)
                for (let i = 1; i <= total; i++) {
                    await prematch1XBET([i])
                }
            }
        } catch (e) {
            console.log('Start getting prematch 1XBET', e.message)
        }
    }
    //1XBET end



    // await getPreBET365()
    // await getPreSbobet()
    await getPre1XBET()


    // setInterval(async function () {
    //     console.log("refesh")
    // }, 1000 * 20)
};