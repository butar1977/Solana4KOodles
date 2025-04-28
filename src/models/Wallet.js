const { default: mongoose } = require('mongoose');
const bcrypt = require('bcrypt');
const CryptoJS = require('crypto-js');

const AES_SECRET_KEY = process.env.AES_SECRET_KEY;

const walletSchema = mongoose.Schema({
    status: {
        type: Boolean,
        default: false
    },
    privateKey: {
        type: String,
        get: (pk) => pk ? CryptoJS.AES.decrypt(pk, AES_SECRET_KEY).toString(CryptoJS.enc.Utf8) : null,
        set: (pk) => CryptoJS.AES.encrypt(pk, AES_SECRET_KEY).toString(),
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    label: {
        type: String,
        default: 'Wallet'
    }
},
    {
        timestamps: true,
        toJSON: { getters: true }, toObject: { getters: true }
    }
);

walletSchema.methods.hashPassword = async function () {
    this.password = await bcrypt.hash(this.password, 10);
};

walletSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const Wallet = mongoose.model('Wallet', walletSchema);

module.exports = Wallet;