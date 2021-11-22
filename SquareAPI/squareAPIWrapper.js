require('dotenv').config();
const { Client, Environment } = require('square')

const POINTS_PER_DOLLAR_REDEEMED = 10

const LOCATION_ID = process.env.LOCATION_ID
const TEST_CARD_SOURCE = "cnon:card-nonce-ok"
const client = new Client({
  environment: Environment.Production,
  accessToken: process.env.SQUARE_ACCESS_TOKEN
})


const customersApi = client.customersApi;
const giftCardsApi = client.giftCardsApi;
const ordersApi = client.ordersApi;
const paymentsApi = client.paymentsApi;
const giftCardActivitiesApi = client.giftCardActivitiesApi;
const loyaltyApi = client.loyaltyApi

function makdeIdempotencyKey() {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < 10; i++ ) {
      result += characters.charAt(Math.floor(Math.random() *
 charactersLength));
   }
   return result;
}

// CUSTOMERS

async function listAllCustomers() {
  try {
    const { result, ...httpResponse } = await customersApi.listCustomers();
    const customers = result.customers
    return customers
  } catch(error) {
      console.log("Error with listCustomres: ", error)
      return {
        error: error
      }
  }
}


async function listCustomersWithLoyaltyPoints() {
  try {
    const { result, ...httpResponse } = await customersApi.listCustomers();
    const customers = result.customers

    var fullCustomerObjs = []
    for await (const customer of customers) {
      console.log(customer)
      const loyaltyAccount = await getLoyaltyAccountByCustomerID(customer.id)
      fullCustomerObjs.push({
        [customer.id]: loyaltyAccount.balance
      })

    }
    return fullCustomerObjs
  } catch(error) {
      console.log("Error with listCustomres: ", error)
      return {
        error: error
      }
  }
}

async function getCustomerByID(customerID) {
  try {
    const { result, ...httpResponse } = await client.customersApi.retrieveCustomer(customerID);
    return result.customer
  } catch(error) {
      console.log("Error with retrieveOrder: ", error)
      return {
        error: error
      }
  }
}

async function handleAddingGiftcardToCustomerNotes(orderID, giftCardID) {

  console.log("\nhandle: 1")
  // 1. Retrieve the order
  const orderDetails = await getOrderByID(orderID)
  console.log(orderDetails)
  if (!orderDetails) return;

  // 2. Get the customer ID
  const customerID = orderDetails.customerId
  console.log(customerID)
  if (!customerID) return;

  // 3. Retrieve the customer details
  const customerDetails = await getCustomerByID(customerID)
  console.log(customerDetails)
  if (!customerDetails) return;

  // 4. Get the notes of the customer
  const customerNotes = customerDetails.note
  var boughtGiftCards = null
  var newNotes = null

  // They have a note and it has some giftcards
  if (customerNotes && customerNotes.match(/^bought_gift_cards/)) {
    boughtGiftCards = customerNotes.match(/([^,]+)/g).slice(1)
  }

  // 5.Upsert the gift card if they have some in there
  if (boughtGiftCards) {
    if (!boughtGiftCards.includes(giftCardID)) {
      newNotes = customerNotes + ',' + giftCardID
    }
  }

  // Goes here if they either don't have a note OR not a note with giftcards
  else {
    newNotes = `bought_gift_cards,${giftCardID}`
  }

  console.log(newNotes)

  try {
    const { result, ...httpResponse } = await client.customersApi.updateCustomer(customerID,
    {
      note: newNotes
    });
    console.log(result)
    return null
  } catch(error) {
      console.log("Error with listOrders: ", error)
      return {
        error: error
      }
  }
}




// ORDERS
async function listOrders() {
  try {
    const { result, ...httpResponse } = await ordersApi.searchOrders({
      locationIds: [
        LOCATION_ID
      ]
    });
    return result.orders
  } catch(error) {
      console.log("Error with listOrders: ", error)
      return {
        error: error
      }
  }
}

async function createOrder(amount, customer_id) {
  const body = {
    order: {
      locationId: LOCATION_ID,
      customerId: customer_id,
      lineItems: [
        {
          name: "giftcardOrder",
          quantity: '1',
          itemType: "GIFT_CARD",
          basePriceMoney: {
            amount: amount * 100,
            currency: 'USD'
          }
        }
      ]
    }
  }

  try {
    const { result, ...httpResponse } = await ordersApi.createOrder(body);
    const returnObj = {
      id: result.order.id,
      uid: result.order.lineItems[0].uid,
      orderState: result.order.state
    }
    return returnObj
  } catch(error) {
      return {
        error: error
      }
  }
}

async function getOrderByID(orderID) {
  try {
    const { result, ...httpResponse } = await client.ordersApi.retrieveOrder(orderID);
    return result.order
  } catch(error) {
      return {
        error: error
      }
  }
}



// PAYMENTS
async function createPayment(order_id, amount) {
  const body = {
    sourceId: TEST_CARD_SOURCE,
    orderId: order_id,
    idempotencyKey: makdeIdempotencyKey(),
    amountMoney: {
      amount: amount * 100,
      currency: 'USD'
    }
  }
  try {
    const { result, ...httpResponse } = await paymentsApi.createPayment(body);
    return {
      status: result.payment.status
    }
  } catch(error) {
      console.log("Error with createPayment: ", error)
      return {
        error: error
      }
  }
}



// GIFT CARDS
async function listGiftCards() {
  try {
    const { result, ...httpResponse } = await giftCardsApi.listGiftCards()
    return result.giftCards
  } catch(error) {
    if (error instanceof ApiError) {
      const errors = error.result;
      console.log("Error with listGiftcards: ", errors)
    }
  }
}

async function retrieveGiftCardStateWithID(giftCardId) {
  try {
    const { result, ...httpResponse } = await giftCardsApi.retrieveGiftCard(giftCardId)
    return result.giftCard.state
  } catch(error) {
    if (error instanceof ApiError) {
      const errors = error.result;
      console.log("Error with retrieveGiftCardState: ", errors)
    }
  }
}

async function retrieveGiftCardBalanceWithID(giftCardId) {
  try {
    const { result, ...httpResponse } = await giftCardsApi.retrieveGiftCard(giftCardId)
    return result.giftCard.balanceMoney.amount
  } catch(error) {
    if (error instanceof ApiError) {
      const errors = error.result;
      console.log("Error with retrieveGiftCardBalance: ", errors)
    }
  }
}

async function createGiftCard() {
  const body = {
    idempotencyKey: makdeIdempotencyKey(),
    locationId: LOCATION_ID,
    giftCard: {
      type: "DIGITAL"
    }
  }

  console.log("\nCreating Gift Card ...")
  try {
    const { result, ...httpResponse } = await giftCardsApi.createGiftCard(body)
    const returnObj = {
      gan: result.giftCard.gan,
      giftCardID: result.giftCard.id
    }
    console.log("Finished creating Gift Card!")
    console.log(returnObj)
    return(returnObj)
  } catch(error) {
      console.log("Error with createGiftCard: ", error)
      return {
        error: error
      }
  }
}

async function activateGiftCard(order_id, uid, gift_card_id) {
  const body = {
    idempotencyKey: makdeIdempotencyKey(),
    giftCardActivity: {
      type: "ACTIVATE",
      locationId: LOCATION_ID,
      giftCardId: gift_card_id,
      activateActivityDetails: {
        orderId: order_id,
        lineItemUid: uid
      }
    },
  }

  console.log("\nActivating Gift Card: " + gift_card_id + " ...")
  try {
    const { result, ...httpResponse } = await giftCardActivitiesApi.createGiftCardActivity(body);
    const giftCardState = await retrieveGiftCardStateWithID(gift_card_id)
    console.log("Finished activating Gift Card, state: " + giftCardState + "!")
    return {
      giftCardState: giftCardState
    }
  } catch(error) {
      console.log("Error with activateGiftCard: ", error)
      return {
        error: error
      }
  }
}


async function redeemGiftCard(giftCardID, amount) {
  const body = {
    idempotencyKey: makdeIdempotencyKey(),
    giftCardActivity: {
      type: "REDEEM",
      locationId: LOCATION_ID,
      giftCardId: giftCardID,
      redeemActivityDetails: {
        amountMoney: {
          amount: amount * 100,
          currency: 'USD'
        }
      }
    },
  }

  console.log("\nRedeeming Gift Card " + giftCardID + " for " + (amount*100) + " ...")
  try {
    const { result, ...httpResponse } = await giftCardActivitiesApi.createGiftCardActivity(body);
    const giftCardBalance = await retrieveGiftCardBalanceWithID(giftCardID)
    console.log("Finished redeeming Gift Card, new balance: " + giftCardBalance + "!")
    return {
      newBalance: giftCardBalance
    }
  } catch(error) {
      console.log("Error with redeemGiftCard: ", error)
      return {
        error: error
      }
  }
}

// Loyalty
async function getLoyaltyAccountByCustomerID(customerID) {
  try {
    const { result, ...httpResponse } = await loyaltyApi.searchLoyaltyAccounts({
      query: {
        customerIds: [
          customerID
        ]
      }
    })
    const loyaltyAccounts = result.loyaltyAccounts
    var matchedLoyaltyAccount = null
    loyaltyAccounts.forEach((la) => {
      if (la.customerId === customerID) {
        matchedLoyaltyAccount = la
      }
    })
    return {
      ...matchedLoyaltyAccount
    }
  } catch(error) {
      console.log("Error with getLoyaltyID: ", error)
      return {
        error: error
      }
  }
}

async function getLoyaltyAccountByLoyaltyID(loyaltyAccountID) {
  try {
    const { result, ...httpResponse } = await loyaltyApi.retrieveLoyaltyAccount(loyaltyAccountID)
    return result.loyaltyAccount
  } catch(error) {
      console.log("Error with getLoyaltyID: ", error)
      return {
        error: error
      }
  }
}

async function addLoyaltyPoints(loyaltyAccountID, pointsToAdd, reason) {
  const body = {
    idempotencyKey: makdeIdempotencyKey(),
    adjustPoints: {
      points: pointsToAdd,
      reason: reason
    }
  }
  console.log("\nAdding " + pointsToAdd + " loyalty points to " + loyaltyAccountID + " for reason: " + reason + " ...")
  try {
    await loyaltyApi.adjustLoyaltyPoints(loyaltyAccountID, body)
    const loyaltyAccount = await getLoyaltyAccountByLoyaltyID(loyaltyAccountID)
    console.log("Finished adding + " + pointsToAdd + " loyalty points, new loyalty points balance: " + loyaltyAccount.balance)
    return {
      newBalance: loyaltyAccount.balance
    }
  } catch(error) {
      console.log("Error with addLoyaltyPoints: ", error)
      return {
        error: error
      }
  }
}



// Full Create and Activate Gift Card Flow
async function createAndActivateGiftCard(amount, customerId) {
  const { id, uid } = await createOrder(amount, customerId)
  const { status } = await createPayment(id, amount)
  const { giftCardID, gan } = await createGiftCard()
  const { giftCardState } = await activateGiftCard(id, uid, giftCardID)
  return {
    giftCardID,
    gan
  }
}

function checkNoteForGiftcards(note) {
  if (note && note.match(/^bought_gift_cards/)) {
    boughtGiftCards = note.match(/([^,]+)/g).slice(1)
    return boughtGiftCards
  }
  return []
}

// Full Handle Loyalty Points on Gift Card Redemption
async function handleLoyaltyPointsAddition(giftCardID, amountRedeemed) {

  // 1. Get all customers
  const allCustomers = await listAllCustomers()
  if (!allCustomers) return;

  // 2. Cycle through each one's notes to find the customer
  var matchCustomerID = null
  allCustomers.forEach((customerObj) => {
    const giftCardIds = checkNoteForGiftcards(customerObj.note)
    if (giftCardIds.includes(giftCardID)) {
      matchCustomerID = customerObj.id
    }
  })
  if (!matchCustomerID) return;

  // 3. Get the loyalty account and add points
  const loyaltyAccount = await getLoyaltyAccountByCustomerID(matchCustomerID)
  const pointsToAdd = (amountRedeemed / 100) * POINTS_PER_DOLLAR_REDEEMED
  console.log("\nAdding " + pointsToAdd + " points to customer " + matchCustomerID + " loyalty account ...")
  const reason = "Redemption for gift card " + giftCardID
  const { newBalance } = await addLoyaltyPoints(loyaltyAccount.id, pointsToAdd, reason)
  console.log("New balance of loyalty account: ", newBalance)
  return null

}

module.exports = {
  listCustomersWithLoyaltyPoints,
  listGiftCards,
  listOrders,
  createOrder,
  createPayment,
  createGiftCard,
  activateGiftCard,
  redeemGiftCard,
  addLoyaltyPoints,
  getLoyaltyAccountByCustomerID,
  handleLoyaltyPointsAddition,
  handleAddingGiftcardToCustomerNotes,
  createAndActivateGiftCard
}

