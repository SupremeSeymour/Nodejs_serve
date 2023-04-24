require('dotenv').config()
const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const ethers = require('ethers')
const readline = require('readline');


const app = express()

const corsOptions = {
  origin: function (origin, callback) {
    if (process.env.ALLOWED_ORIGINS.split(',').indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));

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



function handleCLI() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.on('line', (input) => {
    const command = input.trim().toLowerCase();
    switch (command) {
      case 'sleep':
        enterStandbyMode();
        break;
      case 'wake':
        enterWakeMode();
        break;
      default:
        console.log('Unknown command. Use "sleep" or "wake"');
    }
  });
}


let serverInstance;

function enterStandbyMode() {
  if (serverInstance) {
    serverInstance.close(() => {
      console.log('Server is in standby mode');
    });
  } else {
    console.log('Server is already in standby mode');
  }
}

function enterWakeMode() {
  if (!serverInstance) {
    serverInstance = app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } else {
    console.log('Server is already running');
  }
}


const PORT = process.env.PORT || 3001
serverInstance = app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  handleCLI();
});


//In this setup, when the user clicks the button on the frontend, 
//it will send a request to the Node.js server.
//he server will then use ethers.js to interact with the contract and perform 
// the completeSession function. If the transaction is successful, the server will send a 
// success response back to the frontend, which will display it.