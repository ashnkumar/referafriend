const path = require('path');
const express = require("express");
const squareAPI = require('./SquareAPI/squareApiWrapper')
const AKUtils = require('./utils/utils.js')

const PORT = process.env.PORT || 3001;

const app = express();

app.use(express.json())

app.get("/", (req, res) => {
  res.json({ message: "Refer-a-Friend Server" });
});

app.post("/webhooks/gift_cards", async (req, res) => {
  console.log("\nhere we are: ", req.body)
  if (!req.body.data) {
    return res.sendStatus(200)
  }
  const theObj = req.body.data.object
  console.log(theObj[Object.keys(theObj)[0]])

  const webhookType = req.body.type
  if (webhookType !== 'gift_card.activity.created') { return res.sendStatus(200) }

  const activityObj = req.body.data.object.gift_card_activity
  const giftCardID = activityObj.gift_card_id
  console.log(activityObj.type)

  if (activityObj.type === 'ACTIVATE') {
    const activateObj = activityObj.activate_activity_details
    const orderID = activateObj.order_id
    await squareAPI.handleAddingGiftcardToCustomerNotes(orderID, giftCardID)
    return res.sendStatus(200)
  }

  else if (activityObj.type === 'REDEEM') {
    const redeemObj = activityObj.redeem_activity_details
    const _giftCardID = activityObj.gift_card_id
    const amountRedeemed = redeemObj.amount_money.amount
    await squareAPI.handleLoyaltyPointsAddition(_giftCardID, amountRedeemed)
    return res.sendStatus(200)
  }

  else {
    return res.sendStatus(200)
  }
})

app.get("/api/new_gift_card", (req, res) => {
  const amount = parseInt(req.query.amount)
  const customerID = req.query.customerID
  squareAPI.createAndActivateGiftCard(amount, customerID)
    .then((giftCardState) => {
      return res.json(giftCardState)
    })
})

app.get("/api/list_customers", (req, res) => {
  squareAPI.listCustomersWithLoyaltyPoints()
    .then((customers) => {
      return res.json(AKUtils.akParse(customers))
    })
});

app.get("/api/list_giftcards", (req, res) => {
  squareAPI.listGiftCards()
    .then((giftcards) => {
      return res.json(AKUtils.akParse(giftcards))
    })
});

app.get("/api/list_orders", (req, res) => {
  squareAPI.listOrders()
    .then((orders) => {
      return res.json(AKUtils.akParse(orders))
    })
});

app.get("/api/create_order", (req, res) => {
  const amount = parseInt(req.query.amount)
  const customerID = req.query.customerID
  squareAPI.createOrder(amount, customerID)
    .then((order) => {
      return res.json(AKUtils.akParse(order))
    })
});

app.get("/api/create_payment", (req, res) => {
  const amount = parseInt(req.query.amount)
  const orderID = req.query.order_id
  squareAPI.createPayment(orderID, amount)
    .then((payment) => {
      return res.json(AKUtils.akParse(payment))
    })
});

app.get("/api/create_gift_card", (req, res) => {
  squareAPI.createGiftCard()
    .then((gc) => {
      return res.json(AKUtils.akParse(gc))
    })
});

app.get("/api/activate_gift_card", (req, res) => {
  const orderID = req.query.order_id
  const uid = req.query.uid
  const giftCardID = req.query.gift_card_id
  squareAPI.activateGiftCard(orderID, uid, giftCardID)
    .then((ac) => {
      return res.json(AKUtils.akParse(ac))
    })
});

app.get("/api/redeem_gift_card", (req, res) => {
  const giftCardID = req.query.gift_card_id
  const amount = parseInt(req.query.amount)
  squareAPI.redeemGiftCard(giftCardID, amount)
    .then((rc) => {
      return res.json(AKUtils.akParse(rc))
    })
});


app.get("/api/get_loyalty_account", (req, res) => {
  const customerID = req.query.customerID
  squareAPI.getLoyaltyAccountByCustomerID(customerID)
    .then((l) => {
      return res.json(AKUtils.akParse(l))
    })
});

app.get("/api/add_loyalty_points", (req, res) => {
  const loyaltyAccountID = req.query.loyalty_account_id
  const pointsToAdd = parseInt(req.query.points_to_add)
  const reason = req.query.reason || "Some reason"
  squareAPI.addLoyaltyPoints(loyaltyAccountID, pointsToAdd, reason)
    .then((l) => {
      return res.json(AKUtils.akParse(l))
    })
});

app.listen(PORT, () => {
  console.log(`React-a-Friend server listening on ${PORT}`);
});