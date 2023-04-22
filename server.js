require('dotenv').config()
const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const ethers = require('ethers')

const app = express()
app.use(cors({
  origin: process.env.ORIGIN
}));
app.use(bodyParser.json())

const provider = new ethers.providers.JsonRpcProvider(`https://goerli.infura.io/v3/${process.env.INFURA_API_KEY}`)
const privateKey = process.env.PRIVATE_KEY
const wallet = new ethers.Wallet(privateKey, provider)

app.post('/completeSession', async (req, res) => {
  try {
    const { address, abi, functionName, args } = req.body

    const contract = new ethers.Contract(address, abi, wallet)
    const overrides = { gasLimit: 502466 }
    const transactionResponse = await contract[functionName](...args, overrides)

    // Wait for the transaction to be successful
    const transactionReceipt = await provider.waitForTransaction(transactionResponse.hash)

    // Check if the transaction was successful
    if (transactionReceipt.status === 1) {
      res.json({ success: true, data: transactionResponse })
    } else {
      console.error('Transaction failed:', transactionReceipt) // Add a console log here
      res.status(500).json({ success: false, message: 'Transaction failed.' })
    }
  } catch (error) {
    console.error('Server error:', error) // Add a console log here
    res.status(500).json({ success: false, message: error.message })
  }
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`)
})

//In this setup, when the user clicks the button on the frontend, 
//it will send a request to the Node.js server.
//he server will then use ethers.js to interact with the contract and perform 
// the completeSession function. If the transaction is successful, the server will send a 
// success response back to the frontend, which will display it.