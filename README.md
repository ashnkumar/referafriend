


# Overview
Refer-a-Friend is a Square app built on Square's customer point-of-sale APIs (**[Gift Cards](https://developer.squareup.com/docs/gift-cards/using-gift-cards-api), [Loyalty](https://developer.squareup.com/docs/loyalty/overview), [Customers](https://developer.squareup.com/docs/customers-groups-segments/what-they-are)**) that lets Square customers buy gift cards for their friends -- from their favorite Square merchant -- and get loyalty points every time their friends use those gift cards!
<br />
<br />

# The Problem: *"How do I get new customers?!"*
We talked to multiple small business owners -- both online and brick-and-mortar -- and we heard a constant refrain:

> "I always have to balance serving my most *loyal* customers while marketing to try to get *new customers* in the door. But marketing can be un-targeted and expensive!"

In the online world, businesses have created **"[referral marketing programs](https://referralrock.com/blog/mobile-referral-program-examples/)**" to solve this problem with significant success: *"if you get your friend to use our product, you get a discount!".* 

This works online since **[attribution](https://www.buyapowa.com/blog/what-is-referral-tracking-and-why-is-it-so-important)** is straight-forward: we can give users personalized codes to give to their friends so we know exactly who someone was referred by. **But how can we do that in the physical world?**
<br />
<br />

# Our solution: *Use Square to make "refer-a-friend" IRL*
Refer-a-Friend solves the attribution problem by leveraging Square's **[Gift Cards](https://developer.squareup.com/docs/gift-cards/using-gift-cards-api), [Loyalty](https://developer.squareup.com/docs/loyalty/overview), and [Customers](https://developer.squareup.com/docs/customers-groups-segments/what-they-are)** APIs to reward customers when they refer their friends to a Square seller.

![HowItWorks](https://i.imgur.com/TsghzS0.png)

<br />

### Step 1: The Square seller installs Refer-a-Friend
The seller installs the Refer-a-Friend Square app into their Square store. If they don't already have it set up, the seller creates both **Gift Card** and **Loyalty programs** inside their store dashboard.

### Step 2: "Customer 1" buys a gift card for "Customer 2"
**Customer 1** buys the gift card inside the store on the seller's Square POS system, and sends it to **Customer 2** over email. Refer-a-Friend keeps track that Customer 1 bought that gift card (see **Technical Overview** below).

### Step 3: "Customer 2" redeems their gift card at the store
**Customer 2** comes into the store and redeems their gift card on a purchase.

### Step 4: "Customer 1" instantly gets loyalty points!
Refer-a-Friend instantly adds loyalty points to **Customer 1**'s loyalty account! (see **Technical Overview** below).

**We built Refer-a-Friend to scale**: Refer-a-Friend keeps track of *every* gift card a customer buys and gives them loyalty points whenever *any* of those gift cards is redeemed!
<br />
<br />
<br />

---

# 🚀  Why this matters: *Everyone wins!*
### Square sellers get sales, free marketing, and new customers
Square sellers immediately get a sale when a customer purchases a gift card. And since those customers can earn loyalty points, they will encourage their friends to visit the store. Even after their friends redeem their gift cards, they'll keep coming back since they had a chance to try the product :)

### Existing customers get rewarded 
Now existing customers can show their love for their favorite Square seller by evangelizing the store to their friends, and feel great about racking up loyalty points in the process!

### New customers discover a great new store 
New customers get to try out a store they might have missed, and (hopefully) become long-time customers ... and use Refer-a-Friend to buy gift cards for _their_ friends.
<br />
<br />
<br />

---

# How we built it (technical overview):
Under the hood, Refer-a-Friend uses **multiple Square point-of-sale APIs:**

![techoverview](https://i.imgur.com/POQ89xi.png)

<br />

| Square POS API      | How it's used |
| ----------- | ----------- |
| **[Gift Cards](https://developer.squareup.com/docs/gift-cards/using-gift-cards-api)**      |  We ingest the `gift_card.activity.created` webhook in two ways:<br/><br/>**type: ACTIVATE**<br/><br/>When a Gift Card is purchased and activated, we extract the `giftCardID` from this webhook body, then use the **Orders** endpoint to find the `customerID` of the customer that bought the Gift Card (and update that Customer's `note` field to track the card purchase).<br/><br/>**type: REDEEM**<br/><br/>When a Gift Card is redeemed in-store, this webhook informs us. We take the `giftCardID` from the webhook body, search the **Customers** to find out who bought the card originally, then use the **Loyalty** API to add loyalty points to that customer's account *(more below)*
| **[Loyalty](https://developer.squareup.com/docs/loyalty/overview)**      |  In the **REDEEM** flow from the  `gift_card.activity.created` webhook:<br/><br/>**SearchLoyaltyAccounts**<br/><br/>We use this endpoint to find the `loyaltyAccountID` of the relevant customer that originally bought the gift card.<br/><br/>**AdjustLoyaltyPoints**<br/><br/>Once we have the `loyaltyAccountID`, we call this endpoint to manually add loyalty points to that loyalty account depending on how much was redeemed on the Gift Card.<br/><br/> 
| **[Customers](https://developer.squareup.com/docs/customers-groups-segments/what-they-are)**      |  **UpdateCustomer**<br/><br/>When a customer buys a Gift Card, we use this endpoint to update the `note` field in their Customer object to track the `giftCardID` so we can attribute the card redemption to their loyalty account.<br/><br/>**SearchCustomers**<br/><br/>When a Gift Card is redeemed, we use this endpoint to find out who originally bought the card, so we can give them loyalty points!<br/><br/>

<br />
<br />

---

# Challenges we ran into:
Square's point-of-sale APIs behaved exactly as advertised, so we didn't have many technical issues implementing Refer-a-Friend. 
Still, here were a few 'workarounds' we had to implement to get the app to work how we wanted it to:
* **Square sellers need to set up Loyalty before they can use the app:** Since there's no way to programmatically create a Loyalty program on a seller's behalf, we need them to manually create one within their dashboard, and learn how the system works. Setting up Square Loyalty is quite easy to grasp, but it's something we wish we could handle for them through the API!
* **Interfering with any existing Loyalty programs:** Given the above point of not being able to programmatically create a Loyalty Program, we had to use the existing Loyalty program they have set up. Since Refer-a-Friend manually adjusts loyalty points for Customers, it may confuse Sellers on how customers are racking up loyalty points.
* **Limited metadata capability in Customers API:** To reduce the surface area for security vulnerabilities, we wanted to keep all data related to Refer-a-Friend within the Square ecosystem. We stored the GiftCardIDs of bought gift cards within the Customer object's _note_ field, but this may interfere with whatever notes the seller already has on the customer. We could store the GiftCardIDs in a separate database, but if there were more metadata fields we could programmatically add to Customers, that'd make this way easier!
<br />
<br />

---

# What's next for Refer-a-Friend?

We're extremely excited to get Refer-a-Friend into the **[Square App Marketplace](https://squareup.com/us/en/app-marketplace)** so Square sellers can install it into their stores and start using it!

We've applied for the **[Square Partner Program](https://squareup.com/us/en/partnerships/contact)**, and are working on the following:
* **Building dashboards for sellers to see how effective Refer-a-Friend is:** For the hackathon we focused purely on creating the Square app, but Square sellers will want to see how effective Refer-a-Friend is in driving new business. We're creating a standalone web dashboard for them to get this type of reporting.
* **Creating a robust & secure way to store bought GiftCardIDs for a customer:** As mentioned above, we're using the "note" section of the Customer object to store bought GiftCardIDs. We're migrating this to our own external database.
* **Integrate with Square Marketing:** We'd love to integrate directly with **[Square Marketing](https://squareup.com/us/en/software/marketing)** to automatically inform customers when they've received loyalty points from a gift card redemption, encourage gift card holders to visit the store, and create "flash campaigns" like "3x points if you buy a Gift Card for a friend by Tuesday" to encourage more product adoption!
