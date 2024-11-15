const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bcrypt = require('bcrypt');

const users = () => {
    var UserSchema = new Schema({
        fakeid: { type: Number },
        date: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
        email: { type: String, required: true, unique: true, },
        username: { type: String, unique: true, required: [true, "username is required"] },
        password: {
            type: String,
            unique: false,
            // validate: {
            //   validator: function (v) {
            //     return /(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.{8,})/.test(v);
            //   },
            //   message: props => `${props.value} is not a valid password`
            // },
            required: [true, "password is required"]
        },
        firstname: { type: String },
        lastname: { type: String },
        permission: { type: String },
        status: { type: String, required: true },
        created: { type: Date, default: Date.now(), required: true },
        positiontaking: { type: Number, default: 0 },
        signup_device: { type: String, },
        isdelete: { type: Boolean, default: false },

        currency: { type: String, default: "TRY" },
        country_name: { type: String, default: "" },
        region_name: { type: String, default: "" },
        birth_region_code: { type: String, default: "" },
        birth_region_id: { type: String, default: "" },
        birth_department: { type: String, default: "" },
        birth_city: { type: String, default: "" },
        time_zone: { type: String },
        city_name: { type: String, default: "" },
        country_code: { type: String, default: "" },
        zip_code: { type: String, default: "" },
        area_code: { type: String, default: "" },
        ip: { type: String, default: "" },
        contact: { type: String, default: "" },
        address: { type: String, default: "" },
        mobilenumber: { type: String, default: "" },
        avatar: { type: String, default: "" },
        accountholder: { type: String, default: "" },
        cashdesk: { type: String, default: "" },
        language: { type: String, default: "" },
        middlename: { type: String, default: "" },
        phone: { type: String, default: "" },
        personal_id: { type: String, default: "" },
        affiliate_id: { type: String, default: "" },
        btag: { type: String, default: "" },
        external_id: { type: String, default: "" },
        balance: { type: Number, default: 0 },
        document_issue_code: { type: String, default: "" },
        document_issuedby: { type: String, default: "" },
        document_number: { type: String, default: "" },
        iban: { type: String, default: "" },
        is_logged_in: { type: String, default: "" },
        profile_id: { type: String, default: "" },
        promo_code: { type: String, default: "" },
        province: { type: String, default: "" },
        registration_source: { type: String, default: "" },
        client_category: { type: String, default: "" },
        swiftcode: { type: String, default: "" },
        bank_name: { type: String, default: "" },
        state: { type: String, default: "" },
        last_login_ip: { type: String, default: "" },
        sport_last_bet: { type: String, default: "" },
        gaming_last_bet: { type: String, default: "" },
        custome_player_category: { type: String, default: "" },
        wrong_login_attempts: { type: String, default: "" },
        pep_status: { type: String, default: "" },
        gender: { type: String, default: "" },

        last_login_date: { type: String, default: "" },
        first_deposit_date: { type: String, default: "" },
        document_issue_date: { type: Date, default: "" },
        wrong_login_block_time: { type: Date, default: "" },
        birthday: { type: Date, default: "" },

        test: { type: Boolean, default: false },
        is_verified: { type: Boolean, default: false },
        subscribedtosms: { type: Boolean, default: false },
        subscribedtoemail: { type: Boolean, default: false },
        subscribed_to_newsletter: { type: Boolean, default: false },
        subscribed_to_phone_call: { type: Boolean, default: false },
        subscripted_internal_message: { type: Boolean, default: false },
        subscribed_to_push_notifications: { type: Boolean, default: false },
        usingloyaltyprogram: { type: Boolean, default: false },

        twitter: { type: String },
        facebook: { type: String },
        youtube: { type: String },
        discord: { type: String },
        instagram: { type: String },
        tiktok: { type: String },
        snapchat: { type: String },
        team_id: { type: String },
        level: { type: String, default: "" },
        paypalEmail: { type: String },
        point: { type: Number, default: 0 },

        social_links: { type: Object },
        gamertags: { type: Object },
        banner: { type: String },
        friends_id: { type: String },
        account_number: { type: Number, default: 0 },
        trial_level: { type: String, default: "" },
        expire_time: { type: Date },
        idverify: { type: Boolean, default: false },
        resident: { type: Boolean, default: false },
        playerid: { type: Schema.Types.ObjectId, ref: 'user_players' },
        permissionid: { type: Schema.Types.ObjectId, ref: 'user_role' },
        role: { type: Number, default: 0 },
    });

    UserSchema.methods.generateHash = function (password) {
        return bcrypt.hashSync(password, bcrypt.genSaltSync(10));
    }

    UserSchema.methods.validPassword = function (password, encrypted) {
        return bcrypt.compareSync(password, encrypted);
    }

    UserSchema.pre('save', function () {
        this.set({ fakeid: get_max_id() });
    });

    UserSchema.pre('find', function () {
        // `this` is an instance of mongoose.Query
        this.select(["username", "email", "password",
            "lastname",
            "firstname",
            "status",
            "created",
            "isdelete",
            "gender",
            "address",
            "zip_code",
            'birthday',
            'currency',
            "twitter",
            "facebook",
            "youtube",
            "discord",
            "instagram",
            "tiktok",
            "snapchat",
            "team_id",
            "role",
            "level",
            "balance",
            "paypalEmail",
            "gamertags",
            "time_zone",
            "country_name",
            "region_name",
            "banner",
            "friends_id",
            "social_links",
            "account_number",
            "point",
            "trial_level",
            "expire_time",
            "mobilenumber", "phone", "permission", "avatar", "fakeid", "date"
        ]);
    });


    UserSchema.pre('findOne', function () {
        // `this` is an instance of mongoose.Query
        this.select(["username", "email", "password",
            "lastname",
            "firstname",
            "status",
            "created",
            "positiontaking",
            "signup_device",
            "isdelete",
            "gender",
            "address",
            "zip_code",
            'birthday',
            "twitter",
            'currency',
            "facebook",
            "youtube",
            "discord",
            "instagram",
            "tiktok",
            "snapchat",
            "team_id",
            "role",
            "level",
            "balance",
            "paypalEmail",
            "gamertags",
            "time_zone",
            "country_name",
            "region_name",
            "banner",
            "friends_id",
            "social_links",
            "account_number",
            "point",
            "trial_level",
            "expire_time",
            "mobilenumber", "phone", "permission", "avatar", "fakeid", "date"
        ]);
    });

    UserSchema.pre('findOneAndUpdate', function () {
        this.set({ updatedAt: new Date() });
    });
    UserSchema.pre('updateOne', function () {
        this.set({ updatedAt: new Date() });
    });


    return mongoose.model("user_users", UserSchema)
    // return mongoose.model("user1", UserSchema)
}

function get_max_id() {
    var a = new Date().valueOf() + "";
    var b = a.slice((a.length - 1 - 7), (a.length - 1));
    return b;
}


const Players = () => {
    var UserSchema = new Schema({
        username: {
            type: String,
            required: true, unique: true
        },
        id: {
            type: String,
            required: true,
            unique: true,
        },
        userid: {
            type: Schema.Types.ObjectId, ref: 'user_users'
        },
        email: {
            type: String,
            required: true, unique: true
        },
        balance: {
            type: Number,
            default: 0
        },

        firstname: {
            type: String,
            required: true
        },
        lastname: {
            type: String,
            required: true
        },
        pid: {
            type: Number,
        },
        bonusbalance: {
            type: Number,
            default: 0
        },
    });

    UserSchema.pre('save', function () {
        this.set({ pid: get_max_id() });
    });

    return mongoose.model("user_players", UserSchema)
    // return mongoose.model('netplayerusers', UserSchema)
}

const admin_them = () => {
    var UserSchema = new Schema({
        layout: {
            type: String,
            default: "vertical"
        },
        theme: {
            type: String,
            default: "dark"
        },
        sidebarCollapsed: {
            type: Boolean,
            default: false
        },
        navbarColor: {
            type: String,
            default: "success"
        },
        navbarType: {
            type: String,
            default: "floating"
        },
        footerType: {
            type: String,
            default: "static"
        },
        disableCustomizer: {
            type: Boolean,
            default: false
        },
        hideScrollToTop: {
            type: Boolean,
            default: false
        },
        disableThemeTour: {
            type: Boolean,
            default: false
        },
        menuTheme: {
            type: String,
            default: "success"
        },
        direction: {
            type: String,
            default: "ltr"
        },
        email: {
            type: String,
            default: "ltr"
        }
    });
    return mongoose.model("user_theme", UserSchema)
}

const sessionmodel = () => {
    var UserSchema = new Schema({
        socketid: {
            type: String,
            required: true
        },
        id: {
            type: String,
            required: true
        },
        date: {
            type: Date,
            default: Date.now
        },

    });
    return mongoose.model("user_socket", UserSchema)
}

const usersesmodel = () => {
    const SessionSchema = new Schema({
        id: { type: String, required: true },
        socket_id: { type: String },
        email: { type: String, required: true, unique: true },
        username: { type: String, required: true, unique: true },
        token: { type: String, required: true },
        timestamp: { type: Number, required: true }
    });
    return mongoose.model("user_session", SessionSchema);
}

// const usersesmodel = () =>{
//     var  UserSchema = new Schema({
//         date: {
//             type: Date,
//             default: Date.now
//         },
//         hash : {
//             type :String,
//             required : true
//         },
//         inittime : {
//             type: String,
//             required: true
//         },
//         email: {
//             type: String,
//             unique: true,
//             required: true
//         },
//         id: {
//             type: String,
//             unique: true,
//             required: true
//         },
//         ip: {
//             type: String,
//         },

//     });
//     return mongoose.model("user_session", UserSchema)
// }

const gamesessionmodel = () => {
    var UserSchema = new Schema({
        email: {
            type: String,
            required: true
        },
        username: {
            type: String,
            required: true
        },
        firstname: {
            type: String,
            required: true
        },
        lastname: {
            type: String,
            required: true
        },
        currency: {
            type: String,
            default: "INR"
        },
        date: {
            type: Date,
            default: Date.now
        },
        token: {
            type: String,
            required: true
        },
        intimestamp: {
            type: String,
            required: true
        },
        id: {
            type: String,
            required: true
        },
    });
    return mongoose.model("user_gamesession", UserSchema)
}

const playerlimitModel = () => {
    var UserSchema = new Schema({
        email: {
            type: String,
            required: true, unique: true
        },
        daylimit: {
            type: Number,
            default: 5000
        },
        weeklimit: {
            type: Number,
            default: 15000
        },
        monthlimit: {
            type: Number,
            default: 100000
        },
        userid: {
            type: Schema.Types.ObjectId, ref: 'user_users'
        }
    });


    UserSchema.pre('find', function () {
        this.populate('userid');

    });
    return mongoose.model("user_plimit", UserSchema)
}

const balance_histoy = () => {
    var UserSchema = new Schema({
        email: {
            type: String,
            required: true
        },
        commission: { type: Number, default: 0 },
        username: {
            type: String,
            required: true
        },
        date: {
            type: Date,
            default: Date.now
        },
        createDate: {
            type: Date,
            default: Date.now
        },
        transactionDate: {
            type: Date,
            default: Date.now
        },
        amount: {
            type: Number,
            required: true
        },
        type: {
            type: Number,
            required: true
        },
        amounttype: {
            type: Number,
            required: true
        },
        cemail: {
            type: String,
            required: true
        },
        order_no: {
            type: String,
            required: true
        },
        currency: {
            type: String,
            default: "INR"
        },
        status: {
            type: String,
            default: "success"
        },
        paymentType: {
            type: String,
            default: "admin"
        },
        comment: {
            type: String,
            default: ""
        },
        lastbalance: {
            type: Number,
            required: true
        },
        updatedbalance: {
            type: Number,
            required: true
        }

    });
    return mongoose.model("user_balancehistory", UserSchema)
}

const permission_model = () => {
    var UserSchema = new Schema({
        title: {
            type: String,
            required: true
        },
        order: {
            type: Number,
            default: 0
        },
        id: {
            type: String,
            required: true,
            unique: true
        },
        pid: {
            type: String,
            default: 0
        },

    });
    return mongoose.model("user_role", UserSchema)
}

const totalusermodel = () => {
    var UserSchema = new Schema({
        email: {
            type: String,
            required: true
        },
        ip: {
            type: String,
            required: true
        },
        date: {
            type: Date,
            default: Date.now
        },

    });
    return mongoose.model("user_totalloginusers", UserSchema);
}

const totalgamesusermodel = () => {
    var UserSchema = new Schema({
        email: {
            type: String,
            required: true
        },
        date: {
            type: Date,
            default: Date.now
        },

    });
    return mongoose.model("user_totalgamesusers", UserSchema);
}

const sidebarmodel = () => {
    var UserSchema = new Schema({
        roles: {
            type: Object,
            required: true,
        },
        navLink: {
            type: String,
            required: true
        },
        id: {
            type: String,
            required: true,
            unique: true,
        },
        icon: {
            type: String,
            required: true
        },
        title: {
            type: String,
            required: true
        },
        status: {
            type: Boolean,
            required: true
        },
        pid: {
            type: String,
            required: true
        },
        type: {
            type: String,
            required: true
        },
        children: {
            type: Object,
            default: []
        },
        order: {
            type: Number,
            required: true
        }
    });
    return mongoose.model("user_adminsidebar", UserSchema);
}

const wallethistory_model = () => {
    var UserSchema = new Schema({
        roundid: {
            type: String,
            required: true
        },
        transactionid: {
            type: String,
            required: true
        },
        bonus: {
            type: Boolean,
            default: false
        },
        // GAMEID : {
        //     type : String,
        //     required : true,
        // },
        // LAUNCHURL : {
        //     type : String,
        //     required : true,
        // },
        status: {
            type: String,
            required: true,
        },
        lastbalance: {
            type: Number,
            required: true
        },
        gameid: {
            type: Schema.Types.ObjectId, ref: 'game_game_list',
        },
        userid: {
            type: Schema.Types.ObjectId, ref: 'user_users',
        },
        paymentid: {
            type: Schema.Types.ObjectId, ref: 'Payment_history',
        },
        bazaarid: {
            type: Schema.Types.ObjectId, ref: 'matka_Bazaar',
        },
        matkabetid: {
            type: Schema.Types.ObjectId, ref: 'matka_betmodels',
        },
        // USERID : {
        //     type : String,
        //     required : true
        // },
        commission: {
            type: Number,
            required: true
        },
        credited: {
            type: Number,
            required: true,
        },
        debited: {
            type: Number,
            required: true
        },
        updatedbalance: {
            type: Number,
            required: true
        },
        updated: {
            type: Date,
            default: Date.now
        },
    });
    return mongoose.model("user_wallethistory", UserSchema);
}

const profilemenu_model = () => {
    var UserSchema = new Schema({

        navLink: {
            type: String,
            required: true
        },
        id: {
            type: String,
            required: true,
            unique: true,
        },
        icon: {
            type: String,
            required: true
        },
        title: {
            type: String,
            required: true
        },
        status: {
            type: Boolean,
            required: true
        },
        pid: {
            type: String,
            required: true
        },
        type: {
            type: String,
            required: true
        },
        children: {
            type: Object,
            default: []
        },
        order: {
            type: Number,
            required: true
        },
        mobileicon: {
            type: String,
            required: true
        }
    });
    return mongoose.model("user_profilemenu", UserSchema);
}

module.exports = {
    totalusermodel: totalusermodel(),
    totalgamesusermodel: totalgamesusermodel(),
    adminUser: users(),
    get_themeinfor: admin_them(),
    sessionmodel: sessionmodel(),
    usersessionmodel: usersesmodel(),
    GamePlay: Players(),
    gamesessionmodel: gamesessionmodel(),
    playerlimit: playerlimitModel(),
    balance_histoy: balance_histoy(),
    permission_model: permission_model(),
    sidebarmodel: sidebarmodel(),
    wallethistory: wallethistory_model(),
    profilemenu: profilemenu_model()
}