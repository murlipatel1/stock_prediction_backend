const express = require("express");
const User = require("../models/user");
const {body, validationResult} = require("express-validator");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fetchUser = require("../middleware/fetchuser");

const JWT_SECRET = "thisIsJustAHackathon";

let success = true

//Temporary Data Storage
// router.get("/", (req, res) => {
//     console.log(req.body);
//     res.send(req.body);
//     const user = User(req.body);
//     user.save();
// });

//During Sign Up of User
router.post("/createuser", 
    [
        body("name").isLength({min: 3}),
        body("email").isEmail(),
        body("password").isLength({min: 5}),
    ],
    async(req, res) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()){
            success = false;
            return res.status(400).json({success, errors: errors.array()});
        }

        try{
            let user = await User.findOne({email: req.body.email})
            if (user)
            {
                success = false

                return res.status(400).json({success, errors: `Account Already Exists!!!`});
            }

            const salt = await bcrypt.genSalt(11);
            const secPass = await bcrypt.hash(req.body.password, salt);
            user = await User.create({
                name: req.body.name,
                email: req.body.email,
                password: secPass,
            });

            const data = {
                user: {
                    id: user.id,
                },
            };

            const authToken = jwt.sign(data, JWT_SECRET);

            res.json({success, authToken});
        }   catch (error)   {
            console.error(error);
            res.status(500).send(`Internal Server Error!!!`);
        }
    }
);


//For Logging In
router.post("/login", 
    [
        body("email").isEmail(),
        body("password").isLength({min: 5}),
    ], async(req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()){
            success = false
            return res.status(400).json({success, errors: errors.array()});
        }

        const {email, password} = req.body;
        
        try{
            let user = await User.findOne({email: req.body.email})

            if (!user)
            {
                return res.status(400).json(`Incorrect Details`)
            }
            const passwordComparison = await bcrypt.compare(password, user.password);

            if (!passwordComparison)
            {
                return res.status(400).json({error: `incorrect Details!`});
            }

            const data = {
                user: {
                    id: user.id,
                },
            };

            const authToken = jwt.sign(data, JWT_SECRET);

            res.json({success: true, token:authToken});
        }   catch(error)    {
            console.error(error);
            res.status(500).send(`Internal Server Error!!!`);
        }
    }
);

//For Validation of Users Existence while fetching stock objects of User
router.post("/getuser", fetchUser, async(req, res) => {
    try{
        userId = req.user.id;
        const user = await User.findById(userId).select(`-password`);
        res.send(user);
    }   catch (error)   {
        console.error(error);
        res.status(500).send(`Internal Server Error!!!`);
    }
});

// Get user's current amount
router.get("/getamount", fetchUser, async(req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId).select('amount');
        res.json({ amount: user.amount });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error!!!");
    }
});

module.exports = router;