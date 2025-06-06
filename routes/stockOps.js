const express = require("express");
const {body, validationResult}  = require("express-validator");
const fetchUser = require("../middleware/fetchuser");
const router = express.Router();
const stockS = require("../models/stocksDets");
const User = require("../models/user");

//Mainly, we need three routes.
/*
    1) get method to get all stock objects stored in db
    2) post method to add new stock to db
    3) Update method to delete stocks from db 
*/

//View Stocks
router.get("/fetchallstocks", fetchUser, async(req, res) => {
    try{
        const stocks = await stockS.find({user: req.user.id});
        res.json(stocks);
    }   catch(error)    {
        console.error(error);
        res.status(500).send("Internal Server Error!!!");
    }
});

//Add Stock
router.post("/addstock", fetchUser, 
    [
        body("tickerSymbol").exists(),
        body("stockName").exists(),
        body("status").exists(),
    ],    async(req, res) => {
    
        try{
            const {tickerSymbol, stockName, status, quantity, investedPrice} = req.body;
            const errors = validationResult(req);

            if (!errors.isEmpty())
            {   
                return res.status(400).json({errors: errors.array()});
            }

            const stock = new stockS({
                user: req.user.id,
                tickerSymbol,
                stockName, 
                status,
                quantity: quantity || 1,
                investedPrice: investedPrice || 0,
                buyingDate: Date.now(),
            });

            const saveStock = await stock.save();
            res.json(saveStock);

        }   catch(error)    {
            console.error(error);
            res.status(500).send("Internal Server Error!!!");
        }
    }
);

//Update Stocks
router.put("/updatestock/:id", fetchUser, async(req, res) => {
    try{
        const {status, sellingPrice, units} = req.body;

        // Find the stock first so we can access it for calculations
        let stock = await stockS.findById(req.params.id);

        if (!stock) {
            return res.status(404).send("Not Found!!!");
        }

        if (stock.user.toString() !== req.user.id){
            return res.status(401).send("Not Allowed!!!");
        }

        const newStock = {};

        if (status)
        {
            newStock.status = status;
            
            // If status is 'S' (Sold), then update the sellingDate
            if (status === "S") {
                newStock.sellingDate = Date.now();
            } else if (status === "B") {
                newStock.buyingDate = Date.now();
            }        }

        // Handle selling of stocks - both partial and full selling
        if (status === "S" && units) {
            const isPartialSell = parseFloat(units) < parseFloat(stock.quantity || 1);
            
            // Update the user's balance with profit from the sale
            if (sellingPrice) {                const user = await User.findById(req.user.id);
                if (user) {
                    // Calculate sale amount and profit/loss
                    const saleAmount = parseFloat(sellingPrice) * parseFloat(units);
                    
                    // For partial selling, calculate proportional invested amount
                    const unitRatio = parseFloat(units) / parseFloat(stock.quantity);
                    const soldInvestedPrice = stock.investedPrice * unitRatio;
                    
                    // Calculate profit or loss from this sale
                    const profitLoss = saleAmount - soldInvestedPrice;
                    
                    console.log('Sale details:', {
                        saleAmount,
                        soldInvestedPrice,
                        profitLoss,
                        currentUserAmount: user.amount,
                        newUserAmount: parseFloat(user.amount || 0) + parseFloat(profitLoss)
                    });
                    
                    // The key fix: Add the full sale amount to the user's balance, not just the profit
                    // This is because we want to return both the initial investment and any profit
                    user.amount = parseFloat(user.amount || 0) + parseFloat(saleAmount);
                    await user.save();
                }
            }
            
            if (isPartialSell) {
                // For partial selling, create a new stock entry for the sold portion
                const unitRatio = parseFloat(units) / parseFloat(stock.quantity);
                const soldInvestedPrice = stock.investedPrice * unitRatio;
                const remainingInvestedPrice = stock.investedPrice - soldInvestedPrice;
                  // Create a new stock entry for the sold portion
                const soldStock = new stockS({
                    user: req.user.id,
                    tickerSymbol: stock.tickerSymbol,
                    stockName: stock.stockName,
                    status: "S",
                    quantity: parseFloat(units),
                    investedPrice: soldInvestedPrice,
                    buyingDate: stock.buyingDate,
                    sellingDate: Date.now(),
                    sellingPrice: parseFloat(sellingPrice) || 0
                });
                
                await soldStock.save();
                
                // Update original stock with remaining quantity and invested price
                stock.quantity = parseFloat(stock.quantity) - parseFloat(units);
                stock.investedPrice = remainingInvestedPrice;
                await stock.save();
                
                res.json({ 
                    originalStock: stock,
                    soldStock: soldStock
                });
            } else {                // Full sale
                newStock.sellingPrice = parseFloat(sellingPrice) || 0;
                
                // Update the entire stock record
                stock = await stockS.findByIdAndUpdate(
                    req.params.id,
                    {$set: newStock},
                    {new: true}
                );
                res.json({ stock });
            }
        } else {
            // Not a sale, just a regular update
            stock = await stockS.findByIdAndUpdate(
                req.params.id,
                {$set: newStock},
                {new: true}
            );
            res.json({ stock });
        }
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error!!!");
    }
});

module.exports = router;