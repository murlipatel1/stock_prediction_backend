const mongoose = require('mongoose');
const {Schema} = mongoose;

//Look at the api and figure out how the flow of data is taking place
const stocksSchema = new Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'user'
    },
    tickerSymbol: {
        type: String,
        required: true,
    },
    stockName:{
        type: String,
        required: true,
    },
    status: {
        type: String,
        required: true,
        default: "B",
    },
    quantity: {
        type: Number,
        default: 1,
    },
    investedPrice: {
        type: Number,
        default: 0,
    },
    buyingDate: {
        type: Date,
        default: Date.now(),
    },    sellingDate: {
        type: Date,
        default: Date.now(),
    },
    sellingPrice: {
        type: Number,
        default: 0,
    },
});

const stockS = mongoose.model('stocks', stocksSchema);
module.exports = stockS;